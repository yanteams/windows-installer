# Flow hoạt động của reinstall.sh

## 📋 Tổng quan

`reinstall.sh` là script chính để cài đặt hệ điều hành (Linux/Windows) từ hệ thống hiện tại. Script này chuẩn bị môi trường boot và tải `trans.sh` để thực hiện cài đặt thực tế.

## 🔄 Flow chính

### Phase 1: Khởi tạo và Kiểm tra (Dòng 1-3905)

#### 1.1. Setup môi trường (Dòng 1-100)
```bash
# Cấu hình cơ bản
confhome=https://raw.githubusercontent.com/yanteams/windows-installer/main
confhome_cn=https://cnb.cool/yanteams/windows-installer/-/git/raw/main

# Kiểm tra bash
if [ -z "$BASH" ]; then
    # Cài bash nếu cần
fi

# Setup logging (lọc password)
exec > >(tee >(grep -iv password >>/reinstall.log)) 2>&1
```

**Mục đích:**
- Thiết lập URL repository
- Đảm bảo chạy với bash
- Setup logging (ẩn password)

#### 1.2. Kiểm tra môi trường (Dòng 3863-3905)
```bash
# Không chạy trong Live OS
if mount | grep -q 'tmpfs on / type tmpfs'; then
    error_and_exit "Can't run this script in Live OS."
fi

# Xử lý Windows (nếu chạy từ Windows)
if is_in_windows; then
    # Setup PATH cho 64-bit programs
    # Chuyển output sang tiếng Anh
    # Xử lý Windows commands (wmic, reg, etc.)
fi

# Kiểm tra quyền root/admin
if [ "$EUID" -ne 0 ]; then
    error_and_exit "Please run as root."
fi
```

**Mục đích:**
- Đảm bảo không chạy trong Live OS
- Xử lý đặc biệt cho Windows
- Kiểm tra quyền root/admin

### Phase 2: Parse Arguments (Dòng 3907-4175)

#### 2.1. Định nghĩa options (Dòng 3907-3928)
```bash
long_opts=ci,installer,debug,minimal,allow-ping,force-cn,help,
         add-driver:,hold:,sleep:,iso:,image-name:,boot-wim:,
         img:,lang:,passwd:,password:,ssh-port:,ssh-key:,
         rdp-port:,web-port:,frpc-toml:,force-boot-mode:,
         force-old-windows-setup:
```

#### 2.2. Parse arguments (Dòng 3930-4175)
```bash
opts=$(getopt -n $0 -o "h,x" --long "$long_opts" -- "$@")
eval set -- "$opts"

while true; do
    case "$1" in
    --password) password=$2; shift 2;;
    --rdp-port) rdp_port=$2; shift 2;;
    --allow-ping) allow_ping=1; shift;;
    --add-driver) custom_infs+=$inf; shift 2;;
    --iso) iso=$2; shift 2;;
    --image-name) image_name=$2; shift 2;;
    --lang) lang=$2; shift 2;;
    ...
    esac
done
```

**Mục đích:**
- Parse tất cả command-line arguments
- Lưu vào biến tương ứng
- Validate các giá trị

### Phase 3: Validation và Setup (Dòng 4177-4310)

#### 3.1. Kiểm tra OS name (Dòng 4177-4178)
```bash
verify_os_name "$@"  # Parse distro và releasever
verify_os_args       # Kiểm tra required args
```

**Ví dụ:**
- Input: `windows --image-name="windows 11 pro" --lang=en-us`
- Output: `distro=windows`, `image_name="windows 11 pro"`, `lang=en-us`

#### 3.2. Kiểm tra môi trường (Dòng 4183-4189)
```bash
assert_not_in_container    # Không hỗ trợ container
is_secure_boot_enabled    # Phải tắt Secure Boot
```

#### 3.3. Xử lý password (Dòng 4191-4197)
```bash
if [ -z "$password" ] && [ -z "$ssh_keys" ]; then
    prompt_password  # Yêu cầu nhập password hoặc tạo random
fi
```

#### 3.4. Detect kiến trúc (Dòng 4223-4258)
```bash
# Windows
basearch=$(reg query ... PROCESSOR_ARCHITECTURE)

# Linux
basearch=$(uname -m)

# Chuẩn hóa
case "$basearch" in
    x86_64|amd64) basearch=x86_64; basearch_alt=amd64;;
    aarch64|arm64) basearch=aarch64; basearch_alt=arm64;;
esac
```

#### 3.5. Setup mirror (Dòng 4273-4285)
```bash
if is_in_china; then
    confhome=$confhome_cn  # Dùng mirror Trung Quốc
fi
```

#### 3.6. Kiểm tra RAM (Dòng 4287-4289)
```bash
check_ram  # Kiểm tra RAM có đủ không
           # Nếu không đủ, tự động chuyển sang cloud image mode
```

#### 3.7. Quyết định installation mode (Dòng 4291-4310)
```bash
# Mode 1: Direct installation (không cần Alpine trung gian)
if is_netboot_xyz || 
   { ! is_use_cloud_image && {
       [ "$distro" = "alpine" ] || 
       is_distro_like_debian ||
       # ... các điều kiện khác
   }; }; then
    setos nextos $distro $releasever  # Cài trực tiếp
else
    # Mode 2: Two-step installation (dùng Alpine làm trung gian)
    setos finalos $distro $releasever  # Hệ thống cuối cùng
    setos nextos alpine $alpine_ver    # Alpine trung gian
fi
```

**Lý do 2 mode:**
- **Direct**: Đủ RAM, distro đơn giản → Cài trực tiếp
- **Two-step**: Thiếu RAM hoặc distro phức tạp → Dùng Alpine làm trung gian để tiết kiệm RAM

### Phase 4: Tìm và Setup OS (Dòng 1159-1905)

#### 4.1. Hàm `setos()` - Tìm URL cho OS
```bash
setos() {
    local step=$1      # nextos hoặc finalos
    local distro=$2    # windows, debian, ubuntu, etc.
    local releasever=$3 # 11, 22.04, 2022, etc.
    
    # Gọi hàm tương ứng
    case "$distro" in
    windows) setos_windows;;
    debian) setos_debian;;
    ubuntu) setos_ubuntu;;
    ...
    esac
}
```

#### 4.2. `setos_windows()` - Tìm ISO Windows (Dòng 1523-1596)
```bash
setos_windows() {
    # Nếu không có --iso, tự động tìm
    if [ -z "$iso" ]; then
        find_windows_iso  # Tìm từ massgrave.dev
    fi
    
    # Test URL
    test_url "$iso" iso
    
    # Kiểm tra kiến trúc
    # Lưu vào biến: nextos_iso hoặc finalos_iso
    eval "${step}_iso='$iso'"
}
```

**Flow tìm ISO:**
1. Parse `image_name` → `version`, `edition`
2. Xác định `page_url` (ví dụ: `https://massgrave.dev/windows-server-links`)
3. Tải trang và parse HTML
4. Tìm ISO khớp với regex
5. Lấy direct link

### Phase 5: Cleanup Boot Entries (Dòng 4312-4340)

```bash
if is_efi; then
    # Xóa boot entries cũ
    if is_in_windows; then
        bcdedit /delete {old-entry-id}
    else
        efibootmgr --delete-bootnum {old-entry-id}
    fi
fi
```

**Mục đích:** Xóa boot entries từ lần chạy trước

### Phase 6: Download Boot Files (Dòng 4342-4363)

#### 6.1. Download kernel/initrd
```bash
if is_netboot_xyz; then
    # Download netboot.xyz.efi
    curl -Lo /netboot.xyz.efi $nextos_efi
else
    # Download kernel và initrd
    curl -Lo /reinstall-vmlinuz $nextos_vmlinuz
    curl -Lo /reinstall-initrd $nextos_initrd
    if is_use_firmware; then
        curl -Lo /reinstall-firmware $nextos_firmware
    fi
fi
```

**Files được tải:**
- `/reinstall-vmlinuz` - Linux kernel
- `/reinstall-initrd` - Initial ramdisk
- `/reinstall-firmware` - Firmware (nếu cần)

### Phase 7: Modify Initrd (Dòng 4365-4368)

```bash
if [ "$nextos_distro" = alpine ] || is_distro_like_debian; then
    mod_initrd  # Modify initrd để inject trans.sh
fi
```

**`mod_initrd()` làm gì:**
1. Giải nén initrd
2. Tải `trans.sh` và `initrd-network.sh` vào initrd
3. Inject network config
4. Inject password/SSH keys
5. Modify scripts để tự động chạy `trans.sh`
6. Nén lại initrd

### Phase 8: Setup Boot Loader (Dòng 4383-4633)

#### 8.1. Cài GRUB (nếu cần)
```bash
if is_need_grub_extlinux; then
    if is_in_windows; then
        install_grub_win  # Cài GRUB cho Windows
    else
        if is_efi; then
            install_grub_linux_efi  # Tải GRUB EFI
        fi
    fi
fi
```

#### 8.2. Tìm grub.cfg/extlinux.conf
```bash
# Windows
grub_cfg=/cygdrive/$c/grub.cfg  # EFI
grub_cfg=/cygdrive/$c/grub/grub.cfg  # BIOS

# Linux
grub_cfg=/boot/grub/grub.cfg  # BIOS
grub_cfg=/efi/EFI/reinstall/grub.cfg  # EFI
```

#### 8.3. Build command line
```bash
build_cmdline  # Tạo cmdline cho kernel
               # Bao gồm: nextos_cmdline, finalos_cmdline, extra_cmdline
```

**Ví dụ cmdline:**
```
linux /reinstall-vmlinuz \
  alpine_repo=... modloop=... \
  finalos_distro=windows finalos_iso=... \
  extra_password=... extra_rdp_port=6969 extra_allow_ping=1
```

#### 8.4. Tạo boot entry
```bash
# GRUB
cat >> $grub_cfg <<EOF
menuentry "reinstall (windows 11 pro)" {
    linux /reinstall-vmlinuz $cmdline
    initrd /reinstall-initrd
}
EOF

# EFI
efibootmgr --create --label "reinstall" \
           --loader "\\EFI\\reinstall\\grubx64.efi"
```

### Phase 9: Hoàn tất (Dòng 4635-4678)

```bash
info 'info'
echo "$distro $releasever"
echo "Username: $username"
echo "Password: $password"  # Hoặc SSH key

echo "Reboot to start the installation."
```

## 🔍 Chi tiết các hàm quan trọng

### `find_windows_iso()` (Dòng 871-1107)

**Flow:**
1. Parse `image_name`:
   ```
   "windows server 2022 serverdatacenter"
   → version=2022, edition=serverdatacenter, server=server
   ```

2. Xác định page URL:
   ```bash
   page_url=https://massgrave.dev/windows-server-links
   ```

3. Tải và parse HTML:
   ```bash
   curl -L "$page_url" | 
     grep -Ei '\.(iso|img)</a>$' |
     sed -E 's,<a href="([^"]+)".+>(.+)</a>,\2 \1,' > $tmp/win.list
   ```

4. Tìm ISO khớp:
   ```bash
   regex="en-us_windows_server_2022_.*x64.*.(iso|img)"
   grep -Ei "^$regex " $tmp/win.list
   ```

5. Lấy direct link:
   ```bash
   iso=$(awk '{print $2}' <<<"$line")
   ```

### `mod_initrd()` (Dòng 3703-3783)

**Flow:**
1. Giải nén initrd:
   ```bash
   zcat /reinstall-initrd | cpio -idm
   ```

2. Tải trans.sh:
   ```bash
   curl -Lo $initrd_dir/trans.sh $confhome/trans.sh
   curl -Lo $initrd_dir/initrd-network.sh $confhome/initrd-network.sh
   ```

3. Inject config:
   ```bash
   save_password $initrd_dir/configs  # Lưu password
   echo "$ssh_keys" > $initrd_dir/configs/ssh_keys  # Lưu SSH keys
   ```

4. Modify init script:
   ```bash
   # Alpine: Modify /init
   insert_into_file init before '^exec switch_root' <<EOF
       cp /trans.sh \$sysroot/etc/local.d/trans.start
       chmod a+x \$sysroot/etc/local.d/trans.start
   EOF
   
   # Debian: Modify netcfg.postinst
   # Thay thế netcfg bằng script chạy trans.sh
   ```

5. Nén lại:
   ```bash
   find . | cpio --quiet -o -H newc | gzip -1 >/reinstall-initrd
   ```

### `build_cmdline()` (Dòng 3142-3159)

**Tạo 3 loại cmdline:**

1. **nextos_cmdline**: Cho Alpine/Debian installer
   ```bash
   # Alpine
   nextos_cmdline="alpine_repo=... modloop=..."
   
   # Debian
   nextos_cmdline="auto=true priority=critical url=... mirror=..."
   ```

2. **finalos_cmdline**: Cho hệ thống cuối cùng
   ```bash
   finalos_cmdline="finalos_distro=windows finalos_iso=... finalos_image_name=..."
   ```

3. **extra_cmdline**: Các tùy chọn
   ```bash
   extra_cmdline="extra_password=... extra_rdp_port=6969 extra_allow_ping=1"
   ```

**Kết quả:**
```bash
cmdline="$nextos_cmdline $finalos_cmdline $extra_cmdline"
```

## 📊 Sơ đồ flow tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INITIALIZATION                                           │
│    - Setup confhome, logging                                │
│    - Kiểm tra bash, root, environment                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. PARSE ARGUMENTS                                           │
│    - Parse command-line options                             │
│    - Validate values                                         │
│    - Lưu vào biến: password, rdp_port, iso, etc.            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. VALIDATION                                                │
│    - verify_os_name() → distro, releasever                   │
│    - verify_os_args() → Kiểm tra required args               │
│    - assert_not_in_container()                               │
│    - is_secure_boot_enabled()                               │
│    - prompt_password() (nếu cần)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. DETECT & SETUP                                            │
│    - Detect basearch (x86_64/aarch64)                       │
│    - Setup mirror (CN/US)                                   │
│    - check_ram() → Quyết định cloud_image mode              │
│    - Quyết định installation mode (direct/two-step)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. FIND OS FILES                                             │
│    - setos nextos/finalos $distro $releasever               │
│    - Tìm URL cho kernel, initrd, ISO, etc.                  │
│    - Với Windows: find_windows_iso()                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. DOWNLOAD & MODIFY                                         │
│    - Download vmlinuz, initrd                               │
│    - mod_initrd() → Inject trans.sh, config                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. SETUP BOOT LOADER                                         │
│    - install_grub_win/linux_efi (nếu cần)                   │
│    - build_cmdline() → Tạo kernel cmdline                   │
│    - Tạo boot entry (GRUB/EFI)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. COMPLETE                                                  │
│    - Hiển thị thông tin (username, password)                │
│    - Yêu cầu reboot                                         │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Các biến quan trọng

| Biến | Mô tả | Ví dụ |
|------|-------|-------|
| `confhome` | URL repository chính | `https://raw.githubusercontent.com/yanteams/windows-installer/main` |
| `distro` | Hệ điều hành cần cài | `windows`, `debian`, `ubuntu` |
| `releasever` | Phiên bản | `11`, `22.04`, `2022` |
| `basearch` | Kiến trúc | `x86_64`, `aarch64` |
| `nextos_*` | Thông tin OS trung gian (Alpine) | `nextos_vmlinuz`, `nextos_initrd` |
| `finalos_*` | Thông tin OS cuối cùng | `finalos_iso`, `finalos_image_name` |
| `cmdline` | Kernel command line | `alpine_repo=... finalos_distro=windows ...` |

## 🎯 Điểm quan trọng

1. **reinstall.sh KHÔNG cài đặt trực tiếp**: Chỉ chuẩn bị boot environment
2. **trans.sh mới là script cài đặt thực tế**: Được inject vào initrd và chạy sau khi reboot
3. **Two-step installation**: Nếu thiếu RAM, dùng Alpine làm trung gian
4. **Command line là cách truyền thông tin**: Tất cả thông tin được truyền qua kernel cmdline
5. **Initrd được modify**: Inject trans.sh, config, network script vào initrd

## 📝 Lưu ý

- Script sử dụng nhiều hàm helper để xử lý các trường hợp đặc biệt
- Có xử lý riêng cho Windows (Cygwin) và Linux
- Tự động detect và sử dụng mirror Trung Quốc nếu ở Trung Quốc
- Có nhiều fallback và retry mechanism để đảm bảo reliability

