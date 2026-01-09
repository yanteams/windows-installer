# Hướng dẫn cài đặt Windows từ Linux

Hướng dẫn chi tiết cách sử dụng script `reinstall.sh` để cài đặt Windows trên máy chủ Linux.

## 📋 Mục lục

- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cài đặt script](#cài-đặt-script)
- [Flow hoạt động](#flow-hoạt-động)
- [Cách sử dụng cơ bản](#cách-sử-dụng-cơ-bản)
- [Quy trình sau khi reboot](#quy-trình-sau-khi-reboot)
- [Các phiên bản Windows hỗ trợ](#các-phiên-bản-windows-hỗ-trợ)
- [Tùy chọn nâng cao](#tùy-chọn-nâng-cao)
- [Ví dụ thực tế](#ví-dụ-thực-tế)
- [Xử lý lỗi](#xử-lý-lỗi)
- [FAQ](#faq)

---

## 🔧 Yêu cầu hệ thống

### Yêu cầu bắt buộc:

1. **Quyền root**: Phải chạy với quyền root
   ```bash
   sudo su
   # hoặc
   sudo bash reinstall.sh ...
   ```

2. **Tắt Secure Boot**: Script không hỗ trợ Secure Boot, cần tắt trong BIOS/UEFI

3. **Kết nối Internet**: Cần kết nối mạng để tải ISO và các file cần thiết

4. **Dung lượng ổ cứng**: 
   - Windows 10/11: Tối thiểu 20GB (khuyến nghị 40GB+)
   - Windows Server: Tối thiểu 32GB

5. **RAM**: 
   - Windows 10/11: Tối thiểu 512MB (khuyến nghị 1GB+)
   - Windows Server: Tối thiểu 1GB

### Kiến trúc hỗ trợ:

- ✅ x86_64 (amd64)
- ✅ aarch64 (arm64) - một số phiên bản

---

## 📥 Cài đặt script

### Tải script:

**Chỉ cần tải file `reinstall.sh` là đủ!** Script sẽ tự động tải các file cần thiết khác từ GitHub khi chạy.

```bash
curl -O https://raw.githubusercontent.com/yanteams/windows-installer/main/reinstall.sh
chmod +x reinstall.sh

git clone https://github.com/yanteams/windows-installer.git
cd windows-installer
chmod +x reinstall.sh

./reinstall.sh windows \
  --image-name="windows server 2022 serverdatacenter" \
  --lang=en-us \
  --password "CoConCac975@" \
  --rdp-port 3389 \
  --allow-ping

# Ví dụ 2: Cài Windows với driver tùy chỉnh (nếu cần)
# Có thể chỉ định file .inf hoặc thư mục chứa driver
./reinstall.sh windows \
  --image-name="windows server 2022 serverdatacenter" \
  --lang=en-us \
  --password "CoConCac975@" \
  --rdp-port 6969 \
  --allow-ping \
  --add-driver /path/to/driver.inf
# Hoặc thư mục chứa nhiều driver:
# --add-driver /path/to/drivers/

# Ví dụ 3: Cài Windows với ISO tùy chỉnh (nếu script không tự tìm được)
./reinstall.sh windows \
  --image-name="windows server 2022 serverdatacenter" \
  --lang=en-us \
  --iso="https://example.com/win2022.iso" \
  --password "CoConCac975@" \
  --rdp-port 6969 \
  --allow-ping

```

**Giải thích các tùy chọn trong ví dụ:**

- ✅ **`--password "CoConCac975@"`**: Đặt mật khẩu cho tài khoản Administrator. Mật khẩu sẽ được mã hóa base64 trong autounattend.xml. Nếu không chỉ định, script sẽ tạo mật khẩu ngẫu nhiên và hiển thị trong log.

- ✅ **`--rdp-port 6969`**: Thay đổi cổng RDP từ 3389 (mặc định) sang 6969. Hữu ích để tránh scan port hoặc khi cổng 3389 bị chặn.

- ✅ **`--allow-ping`**: Cho phép ping từ bên ngoài. Mặc định Windows chặn ping để tăng bảo mật.

**Các tùy chọn khác có thể thêm:**

- **`--add-driver`**: Thêm driver tùy chỉnh vào boot.wim. Script sẽ tự động thêm driver cho hầu hết cloud provider và virtualization platform, nhưng nếu có hardware đặc biệt thì cần thêm driver thủ công:
  ```bash
  --add-driver /path/to/driver.inf
  # hoặc thư mục chứa nhiều driver:
  --add-driver /path/to/drivers/
  ```

- **`--iso`**: Chỉ định ISO trực tiếp nếu script không tự tìm được hoặc bạn muốn dùng ISO riêng:
  ```bash
  --iso="https://example.com/win2022.iso"
  ```

- **`--boot-wim`**: Sử dụng boot.wim tùy chỉnh (ít khi cần):
  ```bash
  --boot-wim "https://example.com/boot.wim"
  ```

**Lưu ý quan trọng:**
- ✅ **Chỉ cần file `reinstall.sh`** - script sẽ tự động tải các file phụ thuộc khi cần:
  - `trans.sh` - script cài đặt chính
  - `initrd-network.sh` - cấu hình mạng
  - `debian.cfg`, `ubuntu.yaml`, `redhat.cfg` - file cấu hình
  - `windows-driver-utils.sh` - tiện ích driver Windows
  - Và các file khác khi cần thiết
- ✅ Script tự động phát hiện vị trí địa lý và chọn mirror phù hợp (GitHub hoặc mirror Trung Quốc)
- ✅ Đảm bảo có kết nối Internet ổn định để script tải các file cần thiết

---

## ✨ Tính năng mới

### 🎯 Tự động lấy direct link từ buzzheavier.com

Script giờ đã hỗ trợ **tự động lấy direct link** từ buzzheavier.com! 

**Cách hoạt động:**
- Khi script yêu cầu direct link, chỉ cần paste link buzzheavier.com (ví dụ: `https://buzzheavier.com/gc7av6bnndzv`)
- Script sẽ tự động:
  1. Phát hiện đây là link buzzheavier.com
  2. Gửi request đến `/download` endpoint với headers phù hợp
  3. Lấy header `Hx-Redirect` chứa direct link
  4. Sử dụng direct link đó để tải ISO

**Lợi ích:**
- ✅ Không cần mở trình duyệt để lấy direct link
- ✅ Tự động hóa hoàn toàn quá trình
- ✅ Tiết kiệm thời gian và công sức
- ✅ Vẫn có fallback nếu tự động thất bại

**Ví dụ:**
```bash
Direct Link: https://buzzheavier.com/gc7av6bnndzv
# Script tự động chuyển thành direct link và tiếp tục tải ISO
```

### 📊 Theo dõi tiến trình realtime

Script hỗ trợ theo dõi tiến trình cài đặt realtime qua web dashboard:

- **Backend server**: Chạy trên port 8080 (mặc định)
- **Web dashboard**: Truy cập `http://your-server-ip:8080`
- **Tính năng**:
  - Hiển thị tiến độ realtime với progress bar
  - Logs chi tiết với timestamps
  - Thông báo toast khi có cập nhật
  - Thống kê: tiến độ, số log, thời gian
  - Tự động kết nối lại khi mất kết nối

Xem thêm chi tiết ở phần [Theo dõi quá trình cài đặt](#-cách-theo-dõi-quá-trình-cài-đặt).

---

## 🔄 Flow hoạt động

Hiểu rõ flow hoạt động giúp bạn nắm được quá trình cài đặt và xử lý lỗi tốt hơn.

### Tổng quan

Script cài Windows hoạt động theo 2 giai đoạn chính:
1. **Giai đoạn Linux** (chạy trên hệ thống Linux hiện tại): Chuẩn bị ISO, phân vùng, inject driver, tạo boot entry
2. **Giai đoạn Windows PE** (sau khi reboot): Tự động cài đặt Windows theo autounattend.xml

### Chi tiết từng bước

#### 1. Khởi động và kiểm tra (reinstall.sh)

```bash
./reinstall.sh windows --image-name="windows 11 pro" --lang=en-us
```

- ✅ Kiểm tra quyền root
- ✅ Kiểm tra Secure Boot (phải tắt)
- ✅ Kiểm tra kết nối mạng
- ✅ Kiểm tra kiến trúc máy (x86_64/aarch64)

#### 2. Tải script và dependencies (reinstall.sh)

- Tải `trans.sh` từ GitHub (hoặc mirror Trung Quốc nếu phát hiện ở Trung Quốc)
- Tải các file cần thiết:
  - `windows-driver-utils.sh` - Tiện ích xử lý driver
  - `windows.xml` - Template autounattend.xml
  - `windows-setup.bat` - Script cài đặt trong Windows PE
  - Các file khác khi cần

#### 3. Tìm và tải ISO Windows (trans.sh)

**Nếu không có `--iso`:**
- Tự động tìm ISO từ massgrave.dev theo `--image-name`
- Lấy direct link để tải
- Tải ISO về `/os/windows.iso`

**Nếu có `--iso`:**
- Sử dụng link được chỉ định

#### 4. Tạo phân vùng (trans.sh → create_part)

- Xóa phân vùng cũ
- Tạo phân vùng mới:

**EFI Mode:**
- EFI partition (100MB hoặc 260MB nếu 4K sector)
- MSR partition (16MB)
- OS partition (NTFS) - Phân vùng chính cho Windows

**BIOS Mode:**
- OS partition (NTFS, active) - Phân vùng chính cho Windows

#### 5. Mount phân vùng (trans.sh → mount_part_for_iso_installer)

- Mount `/os` - Phân vùng OS
- Mount `/os/boot/efi` - Phân vùng EFI (nếu EFI)
- Mount `/os/installer` - Phân vùng chứa file cài đặt

#### 6. Xử lý ISO Windows (trans.sh → install_windows)

- Mount ISO: `mount /os/windows.iso /iso`
- Tìm các file quan trọng:
  - `sources/boot.wim` - Windows PE image
  - `sources/install.wim` hoặc `install.esd` - Windows installation image
- Kiểm tra kiến trúc ISO có khớp với máy không

#### 7. Chọn Windows Edition (trans.sh → install_windows)

- Liệt kê tất cả các edition có trong install.wim
- Tìm edition khớp với `--image-name`
- Nếu không tìm thấy: Yêu cầu người dùng chọn từ danh sách

#### 8. Phân tích Windows Image (trans.sh → install_windows)

Mount install.wim để kiểm tra:
- Phiên bản Windows (NT version, Build number)
- Loại Windows (Client/Server)
- Có SAC (Special Administration Console) không
- Có StorNVMe driver không
- Hỗ trợ SHA256 signature không

#### 9. Thêm Driver (trans.sh → install_windows → add_drivers)

Script tự động phát hiện và thêm driver dựa trên:

**Cloud Vendor:**
- AWS: NVMe, ENA drivers
- Azure: MANA drivers
- GCP: VirtIO, GVNIC, GGA drivers
- Aliyun/QCloud/Huawei: VirtIO drivers

**Virtualization:**
- VirtIO (generic hoặc vendor-specific)
- Xen (AWS hoặc Citrix)
- VMD (Intel VMD)

**Hardware:**
- Intel NIC drivers (nếu phát hiện Intel network card)
- Custom drivers (nếu có `--add-driver`)

Tất cả driver được copy vào `/os/drivers/` để inject vào boot.wim

#### 10. Chuẩn bị Boot.wim (trans.sh → install_windows)

- Copy boot.wim từ ISO: `/iso/sources/boot.wim` → `/os/boot.wim`
- Mount boot.wim để chỉnh sửa: `wimmountrw /os/boot.wim`
- Inject các thành phần:
  - **Driver** vào `/wim/drivers/` và `/wim/custom_drivers/`
  - **autounattend.xml** (từ template `windows.xml`)
  - **windows-setup.bat** (thay thế setup.exe mặc định)
- Tắt setup.exe mặc định: `mv setup.exe setup.exe.disabled`
- Commit thay đổi: `wimunmount --commit`

#### 11. Tạo Autounattend.xml (trans.sh → install_windows)

- Tải template: `windows.xml`
- Điền thông tin:
  - Architecture (x86/amd64/arm64)
  - Image name
  - Locale
  - Administrator password (base64 encoded)
  - RDP port (nếu có `--rdp-port`)
  - Partition ID (1 cho BIOS, 3 cho EFI)
  - Product key (nếu cần)
- Lưu vào boot.wim

#### 12. Copy file cài đặt (trans.sh → install_windows)

- Copy boot files: `/iso/boot/*` → `/os/boot/` hoặc `/os/boot/efi/`
- Copy EFI files (nếu EFI): `/iso/efi/*` → `/os/boot/efi/`
- Copy installer files: `/iso/*` → `/os/installer/` (trừ boot.wim, install.wim)
- Copy install.wim: `/iso/sources/install.wim` → `/os/installer/sources/install.wim`

#### 13. Modify Install.wim (tùy chọn) (trans.sh → install_windows)

- Mount install.wim: `wimmountrw /os/installer/sources/install.wim`
- Thêm các script:
  - `windows-resize.bat` - Resize partition sau khi cài
  - `windows-set-netconf.bat` - Cấu hình mạng
- Hoặc gọi `modify_windows()` để cấu hình thêm
- Commit: `wimunmount --commit`

#### 14. Tạo Boot Entry (trans.sh → install_windows)

**EFI Mode:**
- Copy `bootx64.efi` hoặc `bootaa64.efi` vào `/os/boot/efi/EFI/boot/`
- `add_default_efi_to_nvram()` thêm entry vào NVRAM

**BIOS Mode:**
- Cài GRUB: `grub-install --target=i386-pc /dev/$xda`
- Tạo `grub.cfg` để chainload Windows bootmgr

#### 15. Hoàn tất (trans.sh)

- Unmount ISO
- Cleanup
- Hiển thị thông tin:
  - Mật khẩu administrator (nếu không dùng `--password`)
  - Log file: `/reinstall.log`
- Yêu cầu reboot

#### 16. Sau khi reboot - Windows PE Phase

**Boot vào Windows PE:**
- Máy boot vào Windows PE (từ boot.wim đã chỉnh sửa)
- Windows PE tự động chạy `startnet.cmd` → `windows-setup.bat`

**windows-setup.bat thực hiện:**
1. Load driver từ `X:\drivers\` và `X:\custom_drivers\`
2. Phân vùng lại ổ cứng (nếu cần):
   - EFI: Tạo EFI partition, MSR partition, OS partition
   - BIOS: Format OS partition
3. Mount installer partition (Y:)
4. Tạo virtual memory trên installer partition
5. Chạy `setup.exe` với autounattend.xml

**Windows Setup tự động:**
- Đọc autounattend.xml
- Cài đặt Windows vào phân vùng đã chỉ định
- Cấu hình theo autounattend.xml:
  - Tạo user administrator với mật khẩu đã đặt
  - Cấu hình RDP port (nếu có)
  - Cho phép Ping (nếu có `--allow-ping`)
  - Các cấu hình khác

#### 17. Post-installation (modify_windows)

Sau khi Windows cài xong và khởi động lần đầu:
- Cấu hình mạng (nếu có script)
- Đặt RDP port (nếu có `--rdp-port`)
- Cho phép Ping (nếu có `--allow-ping`)
- Các tùy chọn khác

### Sơ đồ flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. reinstall.sh                                             │
│    - Kiểm tra quyền, Secure Boot, mạng                      │
│    - Tải trans.sh và dependencies                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. trans.sh                                                  │
│    - Tìm/tải ISO Windows                                      │
│    - Tạo phân vùng                                           │
│    - Mount phân vùng                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. install_windows()                                        │
│    - Xử lý ISO, chọn edition                                 │
│    - Phân tích Windows image                                  │
│    - Thêm driver (tự động phát hiện)                          │
│    - Chuẩn bị boot.wim (inject driver, autounattend.xml)      │
│    - Copy file cài đặt                                       │
│    - Tạo boot entry                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. REBOOT                                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Windows PE (boot.wim)                                     │
│    - Load driver                                             │
│    - windows-setup.bat                                       │
│      ├─ Phân vùng lại ổ cứng                                 │
│      └─ Chạy setup.exe với autounattend.xml                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Windows Setup                                            │
│    - Tự động cài đặt theo autounattend.xml                   │
│    - Cấu hình user, mật khẩu, RDP, etc.                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Windows khởi động                                         │
│    - Post-installation scripts                               │
│    - Hoàn tất!                                               │
└─────────────────────────────────────────────────────────────┘
```

### Các file quan trọng

| File | Vai trò |
|------|---------|
| `reinstall.sh` | Script chính, tải trans.sh và xử lý tham số |
| `trans.sh` | Script cài đặt chính, chứa toàn bộ logic cài Windows |
| `windows.xml` | Template autounattend.xml |
| `windows-setup.bat` | Script chạy trong Windows PE để cài đặt |
| `windows-driver-utils.sh` | Tiện ích xử lý driver Windows |

### Lưu ý quan trọng

1. **Script không format ổ cứng ngay lập tức**: Chỉ tạo phân vùng mới, format thực sự xảy ra trong Windows PE
2. **Driver được inject vào boot.wim**: Đảm bảo Windows PE có thể nhận diện ổ cứng và network card
3. **Autounattend.xml**: File này cho phép cài đặt hoàn toàn tự động, không cần tương tác
4. **Boot entry**: Script tạo boot entry để máy boot vào Windows PE sau khi reboot

---

## 🚀 Cách sử dụng cơ bản

### 1. Cài Windows với tự động tìm ISO (Khuyến nghị)

Script sẽ tự động tìm và tải ISO từ massgrave.dev:

```bash
./reinstall.sh windows --image-name="windows 11 pro" --lang=en-us
```

**Cú pháp:**
```bash
./reinstall.sh windows --image-name="windows [version] [edition]" --lang=[mã-ngôn-ngữ]
```

**Ví dụ:**
```bash
# Windows 11 Pro tiếng Anh
./reinstall.sh windows --image-name="windows 11 pro" --lang=en-us

# Windows 10 Enterprise tiếng Việt
./reinstall.sh windows --image-name="windows 10 enterprise" --lang=vi-vn

# Windows Server 2022
./reinstall.sh windows --image-name="windows server 2022 serverdatacenter" --lang=en-us
```

### 2. Cài Windows với ISO tùy chỉnh

Nếu bạn đã có link ISO:

```bash
./reinstall.sh windows --image-name="windows 11 pro" --iso="https://example.com/win11.iso" --lang=en-us
```

**Lưu ý:** 
- Link ISO phải là **direct link** (có thể tải trực tiếp, không phải trang HTML)
- Nếu script tự động tìm ISO nhưng link không hoạt động, nó sẽ yêu cầu bạn nhập direct link

**⚠️ Xử lý khi script yêu cầu direct link:**

Khi script hiển thị:
```
***** SET DIRECT LINK *****
Please open https://buzzheavier.com/xxx in browser to get the direct link and paste it here.
Direct Link: 
```

**✨ Tính năng mới: Tự động lấy direct link từ buzzheavier.com**

Script giờ đã hỗ trợ **tự động lấy direct link** từ buzzheavier.com! 

**Cách sử dụng:**
- Chỉ cần paste link buzzheavier.com vào (ví dụ: `https://buzzheavier.com/gc7av6bnndzv`)
- Script sẽ tự động:
  1. Phát hiện đây là link buzzheavier.com
  2. Gửi request đến endpoint `/download` với headers phù hợp
  3. Lấy header `Hx-Redirect` chứa direct link
  4. Sử dụng direct link đó để tải ISO

**Ví dụ:**
```bash
Direct Link: https://buzzheavier.com/gc7av6bnndzv
# Script tự động chuyển thành:
# https://trashbytes.net/dl/Pg5GpTm0KwdidmL14FonZpFJfduA_1Xo0A0imwwRhijJK6GAcSKr_b6GB_gNTINzAWDRfRaQIvE4Z1Cxbwy8h2M2BlAv8TbKgy3FS5puDq_xvGn1vJSzblhcsG70loX72lOO7RLB3o9HPG9J-bEA3lfKSRqjVwKbkU8MpXTtIS9K9GQ?v=...
```

**Nếu tự động thất bại, bạn có thể lấy direct link thủ công:**

1. Mở link trong trình duyệt (ví dụ: `https://buzzheavier.com/xxx`)
2. Đợi trang load, thường sẽ tự động bắt đầu download
3. Nếu có nút download, click chuột phải → "Copy link address"
4. Hoặc dùng Developer Tools (F12) → Network tab → Tìm request có file `.iso`
5. Copy link đó (thường là link từ CDN như `https://software.download.prss.microsoft.com/...`) và paste vào terminal

**Hoặc dùng `--iso` ngay từ đầu:**
```bash
./reinstall.sh windows \
  --image-name="windows server 2022 serverdatacenter" \
  --lang=en-us \
  --iso="https://direct-link-to-iso.com/file.iso" \
  --password "YourPassword"
```

---

## 🔄 Quy trình sau khi reboot

Sau khi script chạy xong và yêu cầu reboot, quy trình tiếp theo như sau:

### Bước 1: Reboot máy

```bash
reboot
```

**Lưu ý:** 
- Đảm bảo đã lưu mật khẩu (nếu không dùng `--password`, mật khẩu sẽ hiển thị trong log)
- Nếu có VNC/Console, nên mở để theo dõi quá trình

### Bước 2: Máy tự động boot vào Windows PE

- Máy sẽ tự động boot vào Windows PE (không cần chọn gì)
- Nếu có nhiều boot entry, chọn entry có tên **"reinstall"** hoặc **"Windows Installer"**
- Quá trình này mất khoảng 1-2 phút

### Bước 3: Windows PE tự động cài đặt

Windows PE sẽ tự động thực hiện:

1. **Load driver** từ `X:\drivers\` và `X:\custom_drivers\`
   - Đảm bảo Windows PE có thể nhận diện ổ cứng và network card

2. **Phân vùng lại ổ cứng** (nếu cần):
   - **EFI Mode**: Tạo EFI partition (100MB), MSR partition (16MB), OS partition (NTFS)
   - **BIOS Mode**: Format OS partition (NTFS, active)

3. **Mount installer partition** (Y:)
   - Chứa file cài đặt Windows

4. **Tạo virtual memory** trên installer partition
   - Giúp quá trình cài đặt ổn định hơn

5. **Chạy `setup.exe`** với autounattend.xml
   - Cài đặt Windows hoàn toàn tự động, không cần tương tác

### Bước 4: Đợi quá trình cài đặt hoàn tất

- ⏱️ **Thời gian:** Thường mất **15-30 phút** (tùy tốc độ ổ cứng và cấu hình máy)
- 🔄 **Máy sẽ tự động reboot nhiều lần** trong quá trình cài đặt (bình thường)
- ⚠️ **KHÔNG tắt máy** hoặc interrupt quá trình
- 📡 **Nếu mất kết nối SSH**: Đợi 15-30 phút rồi thử kết nối lại

**Các giai đoạn bạn có thể thấy:**
- "Windows is loading files..." (Windows PE đang load)
- "Installing Windows..." (Đang cài đặt)
- "Getting devices ready..." (Đang cấu hình driver)
- "Getting ready..." (Đang chuẩn bị)
- Máy reboot vài lần

### Bước 5: Windows khởi động lần đầu

Sau khi cài xong, Windows sẽ:
- Khởi động lần đầu
- Chạy các script post-installation tự động:
  - **Enable WinRM** (tự động) - Cho phép remote qua PowerShell
  - Cấu hình mạng
  - Đặt RDP port (nếu có `--rdp-port`)
  - Cho phép Ping (nếu có `--allow-ping`)
  - Các cấu hình khác

**✨ Tính năng mới: WinRM tự động enable:**
- Script tự động enable WinRM trên port 5985 (HTTP) và 5986 (HTTPS)
- Cho phép remote qua PowerShell ngay cả khi RDP đang restart
- Không bị kick như RDP khi service restart
- Có thể dùng để kiểm tra và sửa lỗi từ xa

**🔍 Dấu hiệu khi cài đặt hoàn tất:**

1. **Ping thành công:**
   ```bash
   ping 159.223.78.17
   # Reply from 159.223.78.17: bytes=32 time=32ms TTL=115
   ```
   ✅ Nếu ping được, nghĩa là Windows đã khởi động và mạng đã hoạt động

2. **Kiểm tra RDP port:**
   ```bash
   # Kiểm tra port mặc định (3389)
   telnet 159.223.78.17 3389
   # hoặc
   nc -zv 159.223.78.17 3389
   
   # Nếu dùng port tùy chỉnh (ví dụ: 6969)
   telnet 159.223.78.17 6969
   nc -zv 159.223.78.17 6969
   ```
   ✅ Nếu port mở, RDP service đã chạy

3. **Kiểm tra thời gian:**
   - Thường mất **15-30 phút** từ lúc reboot
   - Nếu đã qua 30-45 phút và ping được → Windows đã cài xong

4. **Kiểm tra qua PowerShell (nếu có quyền):**
   ```powershell
   # Kết nối qua WinRM hoặc SSH (nếu có)
   Get-Service TermService
   # Status: Running → RDP đã sẵn sàng
   ```

### Bước 6: Đăng nhập Windows

**Thông tin đăng nhập:**
- **Username:** `Administrator`
- **Password:** 
  - Mật khẩu bạn đã đặt với `--password "YourPassword"`
  - Hoặc mật khẩu ngẫu nhiên (xem trong `/reinstall.log` hoặc output của script)
- **RDP Port:** 
  - `3389` (mặc định)
  - Hoặc port bạn đã đặt (ví dụ: `6969` nếu dùng `--rdp-port 6969`)

**Kết nối RDP:**
```bash
# Với port mặc định
mstsc /v:your-server-ip

# Với port tùy chỉnh (ví dụ: 6969)
mstsc /v:your-server-ip:6969
```

**✨ Kết nối WinRM (Nếu RDP bị lỗi):**
```powershell
# Kết nối qua WinRM (port 5985)
Enter-PSSession -ComputerName your-server-ip -Credential (Get-Credential)

# Hoặc với username/password cụ thể
$cred = Get-Credential
Enter-PSSession -ComputerName your-server-ip -Credential $cred

# Kiểm tra và sửa lỗi từ xa
Test-Path "C:\windows-change-rdp-port.bat"
Get-Service TermService
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" -Name PortNumber
```

### ⚠️ Lưu ý quan trọng

1. **KHÔNG tắt máy** trong quá trình cài đặt
2. **KHÔNG interrupt** quá trình boot
3. **Đợi đủ thời gian** (15-30 phút) trước khi thử kết nối lại
4. **Lưu mật khẩu** trước khi reboot (nếu không dùng `--password`)
5. **Nếu có VNC/Console**, nên mở để theo dõi quá trình
6. **Nếu quá trình bị lỗi**, có thể cần cài lại từ đầu

### 🔍 Cách theo dõi quá trình cài đặt

Có nhiều cách để theo dõi quá trình cài đặt Windows:

#### 1. WinRM/PowerShell (Khuyến nghị - Tự động enable)

**✨ Tính năng mới:** Script tự động enable WinRM để remote qua PowerShell!

**Cách sử dụng:**
```powershell
# Kết nối qua WinRM
Enter-PSSession -ComputerName your-server-ip -Credential (Get-Credential)

# Kiểm tra trạng thái
Get-Service TermService
Test-Path "C:\windows-change-rdp-port.bat"
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" -Name PortNumber
```

**Lợi ích:**
- ✅ Không bị kick như RDP khi service restart
- ✅ Có thể remote ngay cả khi RDP đang restart
- ✅ Script tự động enable WinRM (port 5985/5986)
- ✅ Có thể sửa script và cấu hình từ xa

#### 2. VNC/Console (Nếu có)

**VNC là gì?**
- VNC (Virtual Network Computing) cho phép xem và điều khiển màn hình từ xa
- Khác với RDP: VNC hiển thị màn hình thực tế của máy, không tạo session riêng
- Hữu ích khi RDP bị lỗi hoặc cần xem quá trình boot/cài đặt

**Các loại VNC/Console:**

1. **Console của nhà cung cấp (Khuyến nghị - Không cần cài):**
   - **KVM/IP**: Console qua mạng (nhiều nhà cung cấp VPS)
   - **iDRAC** (Dell): Console management interface
   - **iLO** (HP): Integrated Lights-Out management
   - **IPMI**: Intelligent Platform Management Interface
   - **NoVNC**: Web-based VNC client (nhiều cloud provider)
   - ✅ **Không cần cài đặt gì** - Nhà cung cấp đã cung cấp sẵn
   - ✅ **Truy cập qua web browser** hoặc client của nhà cung cấp

2. **VNC Server trên Windows (Cần cài đặt - Tùy chọn):**
   - Script có thể tự động cài TightVNC Server (tùy chọn)
   - Cần mở port VNC (thường là 5900) trong firewall
   - ⚠️ **VNC không được mã hóa mặc định** - Nên dùng qua VPN hoặc SSH tunnel

**Cách sử dụng VNC/Console:**

**Nếu có Console của nhà cung cấp:**
1. Đăng nhập vào control panel của nhà cung cấp (VPS provider)
2. Tìm mục "Console", "VNC", "KVM", hoặc "Remote Console"
3. Click để mở console trong browser hoặc client
4. Xem trực tiếp màn hình Windows

**Nếu muốn cài VNC Server trên Windows (sau khi cài xong):**

**Cách 1: Qua WinRM (Khuyến nghị):**
```powershell
# Kết nối qua WinRM
Enter-PSSession -ComputerName your-server-ip -Credential (Get-Credential)

# Tải và cài TightVNC
Invoke-WebRequest -Uri "https://www.tightvnc.com/download/2.8.8/tightvnc-2.8.8-setup-64bit.msi" -OutFile "$env:TEMP\tightvnc.msi"
Start-Process msiexec.exe -ArgumentList "/i $env:TEMP\tightvnc.msi /quiet /norestart" -Wait

# Hoặc dùng Chocolatey (nếu có)
choco install tightvnc -y
```

**Cách 2: Qua RDP (nếu đã vào được):**
- Download VNC server software
- Cài đặt và cấu hình
- Mở port VNC (thường là 5900) trong firewall

**Cách 3: Tự động cài qua script (Tùy chọn):**
- Script `windows-enable-vnc.bat` có thể tự động cài TightVNC Server
- Chạy sau khi Windows cài xong
- Tự động mở firewall
- ⚠️ **Lưu ý:** Script này chưa được thêm vào danh sách tự động, cần thêm thủ công nếu muốn

**Kết nối VNC:**
```bash
# Sử dụng VNC client (TightVNC Viewer, RealVNC Viewer, etc.)
# Kết nối đến: your-server-ip:5900

# Hoặc qua SSH tunnel (bảo mật hơn):
ssh -L 5900:localhost:5900 user@your-server-ip
# Sau đó kết nối VNC đến localhost:5900
```

**Lưu ý về VNC:**
- ⚠️ **VNC không được mã hóa mặc định** - Nên dùng qua VPN hoặc SSH tunnel
- ✅ **Console của nhà cung cấp** thường an toàn hơn (qua HTTPS)
- 🔒 **Nên dùng VNC qua SSH tunnel** để bảo mật:
  ```bash
  # Tạo SSH tunnel
  ssh -L 5900:localhost:5900 user@your-server-ip
  
  # Sau đó kết nối VNC đến localhost:5900
  ```
- ✅ Thấy được các thông báo lỗi (nếu có)
- ✅ Không cần cấu hình gì thêm

**Các giai đoạn bạn sẽ thấy:**
- "Windows is loading files..." (Windows PE đang load)
- "Installing Windows..." (Đang cài đặt)
- "Getting devices ready..." (Đang cấu hình driver)
- "Getting ready..." (Đang chuẩn bị)
- Máy reboot vài lần (bình thường)

#### 2. EMS/SAC (Emergency Management Services) - Chỉ Windows Server

**Nếu cài Windows Server và có SAC component:**
- ✅ Script tự động bật EMS/SAC khi phát hiện Windows Server có SAC
- ✅ Có thể kết nối qua serial console để theo dõi

**Cách kết nối:**
```bash
# Kết nối qua serial console (COM1, 115200 baud)
# Tùy thuộc vào cloud provider hoặc hypervisor
# Ví dụ với KVM:
virsh console <vm-name>

# Hoặc qua SSH tunnel nếu có serial port forwarding
```

**Lưu ý:**
- Chỉ Windows Server mới có SAC component
- Windows Desktop (Home, Pro, Enterprise) không có SAC
- Script tự động phát hiện và bật EMS nếu có SAC

#### 3. Ping và Network Monitoring

**Kiểm tra máy có còn sống không:**
```bash
# Ping server
ping your-server-ip

# Nếu ping được → máy vẫn đang chạy
# Nếu ping không được → có thể đang reboot hoặc có vấn đề
```

**Lưu ý:**
- Nếu dùng `--allow-ping`, ping sẽ hoạt động ngay sau khi Windows cài xong
- Nếu không dùng `--allow-ping`, ping sẽ không hoạt động (Windows chặn ping mặc định)

#### 4. Thử kết nối RDP (Sau khi cài xong)

**Sau khi đợi 15-30 phút:**
```bash
# Thử kết nối RDP với port mặc định
mstsc /v:your-server-ip

# Hoặc với port tùy chỉnh (ví dụ: 6969)
mstsc /v:your-server-ip:6969
```

**Nếu kết nối được:**
- ✅ Windows đã cài xong
- ✅ Có thể đăng nhập và sử dụng

**Nếu không kết nối được:**
- ⏳ Có thể vẫn đang cài đặt, đợi thêm
- ⚠️ Có thể có lỗi, cần kiểm tra VNC/Console

#### 5. Kiểm tra Log (Nếu có thể truy cập lại Linux)

**Nếu có thể truy cập lại Linux (sau khi cài xong hoặc cài lại):**
```bash
# Xem log cài đặt
cat /reinstall.log

# Log này chứa:
# - Mật khẩu (nếu không dùng --password)
# - Các bước script đã thực hiện
# - Thông tin về ISO, driver, etc.
```

#### 6. Network Traffic Monitoring

**Theo dõi network traffic:**
```bash
# Nếu có quyền truy cập network switch/router
# Có thể thấy network activity khi Windows cài xong và cấu hình mạng
```

### 📊 Bảng so sánh các phương pháp

| Phương pháp | Windows Desktop | Windows Server | Độ khó | Độ chính xác |
|-------------|----------------|---------------|--------|--------------|
| **VNC/Console** | ✅ | ✅ | Dễ | ⭐⭐⭐⭐⭐ |
| **EMS/SAC** | ❌ | ✅ | Trung bình | ⭐⭐⭐⭐ |
| **Ping** | ⚠️ (cần --allow-ping) | ⚠️ (cần --allow-ping) | Dễ | ⭐⭐ |
| **RDP** | ✅ (sau khi cài xong) | ✅ (sau khi cài xong) | Dễ | ⭐⭐⭐⭐ |
| **Log** | ✅ | ✅ | Dễ | ⭐⭐⭐ |

### ⚠️ Lưu ý quan trọng

1. **VNC/Console là cách tốt nhất** - Nếu có, nên dùng để theo dõi
2. **EMS/SAC chỉ cho Windows Server** - Windows Desktop không hỗ trợ
3. **Đợi đủ thời gian** - Quá trình cài đặt mất 15-30 phút, không nên vội
4. **Máy sẽ reboot nhiều lần** - Đây là bình thường, không phải lỗi
5. **Nếu mất kết nối SSH** - Đợi 15-30 phút rồi thử lại

---

## 📦 Các phiên bản Windows hỗ trợ

### Windows Desktop:

| Phiên bản | Edition hỗ trợ |
|-----------|----------------|
| **Windows 11** | home, pro, enterprise, education, pro education, pro for workstations, iot enterprise, enterprise ltsc 2024 |
| **Windows 10** | home, pro, enterprise, education, pro education, pro for workstations, iot enterprise, enterprise ltsc 2019/2021 |
| **Windows 8.1** | core, pro, enterprise |
| **Windows 8** | core, pro, enterprise |
| **Windows 7** | starter, home basic, home premium, professional, enterprise, ultimate |
| **Windows Vista** | starter, home basic, home premium, business, enterprise, ultimate |

### Windows Server:

| Phiên bản | Edition hỗ trợ |
|-----------|----------------|
| **Windows Server 2025** | serverstandard, serverdatacenter |
| **Windows Server 2022** | serverstandard, serverdatacenter |
| **Windows Server 2019** | serverstandard, serverdatacenter |
| **Windows Server 2016** | serverstandard, serverdatacenter |
| **Windows Server 2012 R2** | serverstandard, serverdatacenter |
| **Windows Server 2008 R2** | serverweb, serverstandard, serverenterprise, serverdatacenter |

---

## 🌍 Mã ngôn ngữ (Language codes)

Một số mã ngôn ngữ phổ biến:

| Mã | Ngôn ngữ |
|----|----------|
| `en-us` | English (United States) |
| `en-gb` | English (United Kingdom) |
| `vi-vn` | Tiếng Việt |
| `zh-cn` | 简体中文 |
| `zh-tw` | 繁體中文 |
| `ja-jp` | 日本語 |
| `ko-kr` | 한국어 |
| `fr-fr` | Français |
| `de-de` | Deutsch |
| `es-es` | Español |
| `pt-br` | Português (Brasil) |
| `ru-ru` | Русский |

**Xem thêm:** Script hỗ trợ nhiều ngôn ngữ khác, xem trong code hoặc thử với mã ngôn ngữ chuẩn ISO 639.

---

## ⚙️ Tùy chọn nâng cao

### 1. Đặt mật khẩu

```bash
./reinstall.sh windows --image-name="windows 11 pro" --lang=en-us --password "MySecurePass123"
```

**Lưu ý:** 
- Nếu không đặt mật khẩu, script sẽ tạo mật khẩu ngẫu nhiên
- Mật khẩu sẽ được hiển thị trong log (file `/reinstall.log`)

### 2. Thêm SSH Key (không hỗ trợ)

⚠️ **Lưu ý:** Windows không hỗ trợ SSH key trong script này. Chỉ có thể dùng mật khẩu.

### 3. Đặt cổng RDP

```bash
./reinstall.sh windows --image-name="windows 11 pro" --lang=en-us --rdp-port 3390
```

Mặc định RDP port là 3389.

### 4. Cho phép Ping

```bash
./reinstall.sh windows --image-name="windows 11 pro" --lang=en-us --allow-ping
```

### 5. Thêm Driver Windows

Nếu máy chủ cần driver đặc biệt:

```bash
./reinstall.sh windows --image-name="windows 11 pro" --lang=en-us --add-driver /path/to/driver.inf
# hoặc thư mục chứa nhiều driver
./reinstall.sh windows --image-name="windows 11 pro" --lang=en-us --add-driver /path/to/drivers/
```

### 6. Sử dụng boot.wim tùy chỉnh

```bash
./reinstall.sh windows --image-name="windows 11 pro" --lang=en-us --boot-wim "https://example.com/boot.wim"
```

### 7. Kết hợp nhiều tùy chọn

```bash
./reinstall.sh windows \
  --image-name="windows 11 pro" \
  --lang=en-us \
  --password "MyPass123" \
  --rdp-port 3390 \
  --allow-ping \
  --add-driver /path/to/drivers/
```

---

## 💡 Ví dụ thực tế

### Ví dụ 1: Cài Windows 11 Pro tiếng Anh

```bash
./reinstall.sh windows --image-name="windows 11 pro" --lang=en-us --password "Admin123!"
```

### Ví dụ 2: Cài Windows 10 Enterprise LTSC 2021

```bash
./reinstall.sh windows --image-name="windows 10 enterprise ltsc 2021" --lang=en-us
```

### Ví dụ 3: Cài Windows Server 2022 Datacenter

```bash
./reinstall.sh windows --image-name="windows server 2022 serverdatacenter" --lang=en-us --password "ServerPass123"
```

### Ví dụ 4: Cài Windows với ISO tùy chỉnh

```bash
./reinstall.sh windows \
  --image-name="windows 11 pro" \
  --iso="https://example.com/win11-pro.iso" \
  --lang=en-us \
  --password "MyPass123"
```

### Ví dụ 5: Cài Windows với driver tùy chỉnh

```bash
./reinstall.sh windows \
  --image-name="windows 11 pro" \
  --lang=en-us \
  --password "MyPass123" \
  --add-driver /root/drivers/network/ \
  --add-driver /root/drivers/storage/
```

---

## 🔍 Xử lý lỗi

### Lỗi 1: "Not support find this iso"

**Nguyên nhân:** Tên image-name không đúng hoặc không hỗ trợ.

**Giải pháp:**
- Kiểm tra lại cú pháp `--image-name`
- Thử dùng `--iso` để chỉ định ISO trực tiếp
- Xem danh sách phiên bản hỗ trợ ở trên

### Lỗi 2: "Can't get direct link" hoặc "Expected type: iso, Actually type: html"

**Nguyên nhân:** Script tự động tìm ISO nhưng link từ massgrave.dev không phải direct link (trả về HTML thay vì file ISO).

**Giải pháp:**

1. **Script sẽ yêu cầu bạn nhập direct link:**
   ```
   ***** SET DIRECT LINK *****
   Please open https://buzzheavier.com/xxx in browser to get the direct link and paste it here.
   Direct Link: 
   ```

2. **✨ Cách 1: Tự động lấy direct link (Khuyến nghị - Tính năng mới!)**
   
   Script giờ đã hỗ trợ **tự động lấy direct link** từ buzzheavier.com!
   
   **Chỉ cần paste link buzzheavier.com:**
   ```bash
   Direct Link: https://buzzheavier.com/gc7av6bnndzv
   ```
   
   Script sẽ tự động:
   - Phát hiện đây là link buzzheavier.com
   - Gửi request đến `/download` endpoint với headers phù hợp
   - Lấy header `Hx-Redirect` chứa direct link
   - Sử dụng direct link đó để tải ISO
   
   **Thông báo khi thành công:**
   ```
   ***** ĐANG THỬ TỰ ĐỘNG LẤY DIRECT LINK TỪ BUZZHEAVIER.COM... *****
   ***** TRYING TO AUTOMATICALLY GET DIRECT LINK FROM BUZZHEAVIER.COM... *****
   ***** ĐÃ LẤY ĐƯỢC DIRECT LINK TỰ ĐỘNG! *****
   ***** SUCCESSFULLY GOT DIRECT LINK AUTOMATICALLY! *****
   ```
   
   **Nếu tự động thất bại**, script sẽ yêu cầu bạn nhập thủ công.

3. **Cách 2: Dùng trình duyệt (Nếu tự động thất bại)**
   - Mở link trong trình duyệt (ví dụ: `https://buzzheavier.com/gc7av6bnndzv`)
   - Đợi trang load và bắt đầu download tự động
   - Click chuột phải vào nút download (nếu có) → "Copy link address"
   - Hoặc dùng Developer Tools (F12) → Network tab → Tìm request có file `.iso`
   - Copy link đó và paste vào terminal

4. **Cách 3: Dùng wget/curl để lấy redirect**
   ```bash
   # Xem redirect cuối cùng
   curl -I -L "https://buzzheavier.com/gc7av6bnndzv" | grep -i location
   
   # Hoặc dùng wget để xem redirect
   wget --spider --server-response "https://buzzheavier.com/gc7av6bnndzv" 2>&1 | grep -i location
   ```

5. **Cách 4: Dùng `--iso` với link khác**
   - Tìm ISO từ nguồn khác (Microsoft, TechBench, etc.)
   - Dùng `--iso` để chỉ định trực tiếp:
     ```bash
     ./reinstall.sh windows \
       --image-name="windows server 2022 serverdatacenter" \
       --lang=en-us \
       --iso="https://direct-link-to-iso.com/file.iso" \
       --password "YourPassword" \
       --rdp-port 6969 \
       --allow-ping
     ```

6. **Lưu ý:** Direct link thường có định dạng:
   - Kết thúc bằng `.iso` hoặc `.img`
   - Khi truy cập trực tiếp sẽ bắt đầu download file ngay
   - Không phải trang HTML

### Lỗi 3: RDP Black Screen hoặc không kết nối được

**Triệu chứng:**
- ✅ Ping thành công
- ❌ RDP kết nối được nhưng màn hình đen (black screen)
- ❌ Hoặc không kết nối được RDP

**Nguyên nhân và giải pháp:**

#### 1. **RDP chưa sẵn sàng (Windows đang khởi động)**

**Dấu hiệu:**
- Ping được nhưng RDP port chưa mở
- Windows vẫn đang trong quá trình khởi động lần đầu

**Giải pháp:**
- ⏱️ **Đợi thêm 5-10 phút** - Windows có thể đang chạy các script post-installation
- Kiểm tra lại RDP port sau vài phút:
  ```bash
  # Kiểm tra port mặc định
  nc -zv 159.223.78.17 3389
  
  # Hoặc port tùy chỉnh (nếu có)
  nc -zv 159.223.78.17 6969
  ```

#### 2. **Sai RDP Port**

**Dấu hiệu:**
- Đã dùng `--rdp-port 6969` nhưng kết nối port 3389

**Giải pháp:**
```bash
# Kết nối với port đúng
mstsc /v:159.223.78.17:6969

# Hoặc kiểm tra port nào đang mở
nmap -p 3389,6969 159.223.78.17
```

#### 3. **Windows Firewall chặn RDP**

**Dấu hiệu:**
- Ping được nhưng RDP port không mở

**Giải pháp:**
- Script tự động mở firewall cho RDP, nhưng nếu vẫn bị chặn:
  - Đợi thêm vài phút để script chạy xong
  - Hoặc dùng VNC/Console để vào và kiểm tra firewall

#### 4. **RDP Service chưa khởi động**

**Dấu hiệu:**
- Windows đã khởi động nhưng RDP service chưa chạy

**Giải pháp:**
- Đợi thêm 2-3 phút - Windows có thể đang cấu hình
- Hoặc dùng VNC/Console để kiểm tra:
  ```powershell
  Get-Service TermService
  # Nếu Status != Running, đợi thêm hoặc khởi động thủ công
  ```

#### 5. **Black Screen khi kết nối RDP**

**Nguyên nhân:**
- Windows đang trong quá trình khởi động
- Hoặc Windows đang ở màn hình lock/login

**Giải pháp:**
- ⏱️ **Đợi 2-3 phút** sau khi kết nối RDP
- Thử **Ctrl+Alt+End** để mở Task Manager hoặc lock screen
- Thử **Ctrl+Shift+Esc** để mở Task Manager
- Thử gõ mật khẩu và Enter (có thể đang ở màn hình login)
- Nếu vẫn đen, đợi thêm 5-10 phút rồi disconnect và kết nối lại

#### 6. **Kiểm tra RDP đã sẵn sàng chưa**

**Các bước kiểm tra:**

```bash
# 1. Kiểm tra ping
ping 159.223.78.17
# ✅ Nếu ping được → Mạng OK

# 2. Kiểm tra RDP port
nc -zv 159.223.78.17 3389
# hoặc
nc -zv 159.223.78.17 6969  # nếu dùng port tùy chỉnh
# ✅ Nếu port mở → RDP service đã chạy

# 3. Kiểm tra tất cả port đang mở
nmap -p 3389,6969,5985,5986 159.223.78.17
# 5985/5986 = WinRM (nếu có)

# 4. Thử kết nối RDP
mstsc /v:159.223.78.17:6969
# Nếu kết nối được nhưng black screen → Đợi thêm
```

#### 7. **Nếu vẫn không được**

**Các bước tiếp theo:**

1. **Kiểm tra qua VNC/Console** (nếu có):
   - Xem Windows đã boot xong chưa
   - Kiểm tra màn hình có hiển thị gì không
   - Xem có lỗi gì không

2. **Kiểm tra log** (nếu có quyền SSH):
   - Xem `/reinstall.log` để biết mật khẩu
   - Kiểm tra script post-installation có chạy xong không

3. **Đợi thêm thời gian:**
   - Windows Server có thể mất **30-45 phút** để hoàn tất cài đặt
   - Đặc biệt là lần khởi động đầu tiên

4. **Thử lại sau 10-15 phút:**
   - Disconnect RDP
   - Đợi 10-15 phút
   - Kết nối lại

**Lưu ý quan trọng:**
- ⏱️ **Kiên nhẫn đợi** - Windows cần thời gian để khởi động và cấu hình
- 🔄 **Thử kết nối lại** sau vài phút nếu black screen
- 📡 **Dùng VNC/Console** nếu có để xem trực tiếp màn hình
- 🔍 **Kiểm tra port** trước khi kết nối RDP

### Lỗi 3.1: RDP bị kick ra sau một lúc

**Triệu chứng:**
- ✅ Kết nối RDP thành công
- ⏳ Thấy màn hình "Please wait for the Local Session Manager"
- ❌ Sau đó bị disconnect/kick ra
- ❌ Có thể kết nối lại ngay sau đó

**Nguyên nhân:**

1. **Script post-installation đang chạy:**
   - Script `windows-change-rdp-port.bat` đang restart RDP service để áp dụng port mới
   - Khi RDP service restart, Local Session Manager service cũng restart
   - Tất cả session RDP đang kết nối sẽ bị disconnect

2. **Local Session Manager đang khởi động:**
   - Màn hình "Please wait for the Local Session Manager" xuất hiện khi service đang restart
   - Đây là quá trình bình thường khi Windows cấu hình RDP lần đầu
   - Service cần thời gian để khởi động lại và áp dụng cấu hình mới

**Giải pháp:**

1. **Đợi script chạy xong (Khuyến nghị):**
   - ⏱️ **Đợi 5-10 phút** sau khi Windows khởi động lần đầu
   - Script post-installation sẽ tự động chạy và hoàn tất
   - Khi thấy màn hình "Please wait for the Local Session Manager":
     - ✅ **Đây là bình thường** - Service đang restart
     - ⏱️ **Đợi 1-2 phút** để service khởi động lại
     - 🔄 **Kết nối lại** sau khi bị kick
   - Sau đó kết nối RDP lại sẽ ổn định

2. **Kiểm tra script đã chạy xong chưa:**
   ```powershell
   # Nếu có thể kết nối RDP, mở PowerShell và kiểm tra:
   Get-Process | Where-Object {$_.Path -like "*windows-change-rdp-port.bat*"}
   # Nếu không có process nào → Script đã chạy xong
   
   # Hoặc kiểm tra file còn tồn tại không:
   Test-Path "C:\windows-change-rdp-port.bat"
   # False → Script đã chạy xong và tự xóa
   ```

3. **Kết nối lại sau khi bị kick:**
   - Script restart RDP service chỉ mất vài giây
   - **Kết nối lại ngay** sau khi bị disconnect
   - Lần này sẽ ổn định vì script đã chạy xong

4. **Nếu vẫn bị kick liên tục:**
   - Có thể script đang retry restart RDP service
   - Đợi thêm 2-3 phút để script hoàn tất
   - Hoặc dùng VNC/Console để xem trực tiếp

**Các script post-installation tự động chạy:**
- `windows-change-rdp-port.bat` - Thay đổi RDP port (nếu có `--rdp-port`)
- `windows-allow-ping.bat` - Cho phép ping (nếu có `--allow-ping`)
- `windows-resize.bat` - Resize partition (nếu cần)
- `windows-set-netconf-*.bat` - Cấu hình mạng (nếu cần)

**Quy trình khi thấy "Please wait for the Local Session Manager":**

1. **Màn hình xuất hiện:**
   - "Please wait for the Local Session Manager" → Service đang restart
   - Đây là **bình thường** khi script đang cấu hình RDP

2. **Bị kick ra:**
   - Session RDP sẽ bị disconnect
   - Đây là **bình thường** - Service đang restart

3. **Kết nối lại:**
   - ⏱️ **Đợi 1-2 phút** để service khởi động lại hoàn toàn
   - 🔄 **Kết nối lại RDP** - Lần này sẽ ổn định hơn
   - Nếu vẫn thấy màn hình đó → Đợi thêm 2-3 phút

4. **Sau khi script chạy xong:**
   - Script sẽ tự xóa (không còn file `.bat`)
   - RDP sẽ ổn định và không bị kick nữa
   - Không còn thấy màn hình "Please wait" nữa

**Lưu ý:**
- ⏱️ **Đợi 5-10 phút** sau khi Windows khởi động để script chạy xong
- 🔄 **Kết nối lại** sau khi bị kick - lần này sẽ ổn định
- 📝 **Script tự xóa** sau khi chạy xong (không còn file `.bat`)
- ✅ **Sau khi script chạy xong**, RDP sẽ ổn định và không bị kick nữa
- ⏳ **Màn hình "Please wait"** là bình thường - chỉ cần đợi service restart xong

### Lỗi 3.2: Vẫn bị kick sau 30 phút

**Triệu chứng:**
- ⏱️ Đã đợi 30+ phút
- ❌ Vẫn thấy màn hình "Please wait for the Local Session Manager"
- ❌ Vẫn bị kick ra liên tục

**Nguyên nhân có thể:**

1. **Script đang retry liên tục:**
   - Script `windows-change-rdp-port.bat` có retry logic (tối đa 5 lần)
   - Nếu RDP service không restart thành công, script sẽ retry
   - Mỗi lần retry sẽ restart RDP service → kick session

2. **RDP service không ổn định:**
   - RDP service có thể đang crash hoặc restart liên tục
   - Có thể do conflict với các service khác

3. **Script bị stuck:**
   - Script có thể đang chờ điều kiện nào đó
   - Hoặc đang trong vòng lặp retry

**Giải pháp:**

#### 1. **Kiểm tra từ máy khác (Không cần vào RDP):**

**Kiểm tra RDP port đã đổi chưa:**
```bash
# Kiểm tra port nào đang mở
nmap -p 3389,6969 159.223.78.17

# Hoặc dùng telnet/nc
nc -zv 159.223.78.17 3389
nc -zv 159.223.78.17 6969

# Nếu port 6969 mở → Port đã đổi thành công, script đã chạy xong
# Nếu chỉ port 3389 mở → Port chưa đổi, script có thể đang chạy hoặc lỗi
```

**Nếu port 6969 đã mở:**
- ✅ Script đã chạy xong và port đã đổi
- ✅ Kết nối RDP với port 6969: `mstsc /v:159.223.78.17:6969`
- ⚠️ Nếu vẫn bị kick → Có thể RDP service không ổn định, đợi thêm

**Nếu chỉ port 3389 mở:**
- ⚠️ Script có thể đang chạy hoặc đã lỗi
- ⏱️ Đợi thêm 5-10 phút rồi kiểm tra lại
- Nếu vẫn chỉ port 3389 mở sau 40-50 phút → Script có thể lỗi

#### 2. **Kiểm tra script còn chạy không (Nếu có thể vào RDP):**

Nếu có thể kết nối RDP (dù bị kick), mở PowerShell và kiểm tra:

```powershell
# Kiểm tra file script còn tồn tại không
Test-Path "C:\windows-change-rdp-port.bat"
# True → Script vẫn còn, chưa chạy xong
# False → Script đã chạy xong và tự xóa

# Kiểm tra RDP service status
Get-Service TermService
# Status: Running → Service đang chạy
# Status: Stopped → Service đã dừng (có vấn đề)

# Kiểm tra RDP port đã đổi chưa
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" -Name PortNumber
# PortNumber: 6969 → Port đã đổi thành công
# PortNumber: 3389 → Port chưa đổi (script chưa chạy xong)
```

#### 3. **Nếu không thể vào RDP để kiểm tra:**

**Cách 1: Đợi thêm (Nếu script đang retry):**
- Script có retry logic, mỗi lần retry cách nhau 10 giây
- Tối đa 5 lần retry = 50 giây
- ⏱️ **Đợi thêm 2-3 phút** để script hoàn tất retry

**Cách 2: Chạy script thủ công (Nếu script bị stuck):**
```powershell
# Mở PowerShell với quyền Administrator
# Chạy script thủ công
C:\windows-change-rdp-port.bat

# Hoặc kiểm tra log (nếu có)
Get-Content "C:\windows-change-rdp-port.bat"
```

**Cách 3: Xóa script và cấu hình thủ công (Nếu script lỗi):**
```powershell
# 1. Xóa script
Remove-Item "C:\windows-change-rdp-port.bat" -Force

# 2. Cấu hình RDP port thủ công
$port = 6969
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" -Name PortNumber -Value $port

# 3. Thêm firewall rule
New-NetFirewallRule -DisplayName "Remote Desktop - Custom Port (TCP-In)" -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow
New-NetFirewallRule -DisplayName "Remote Desktop - Custom Port (UDP-In)" -Direction Inbound -Protocol UDP -LocalPort $port -Action Allow

# 4. Restart RDP service
Restart-Service TermService -Force

# 5. Kiểm tra port đã đổi
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" -Name PortNumber
```

**Cách 1: Dùng VNC/Console (Nếu có - Khuyến nghị):**
- Vào Windows qua VNC/Console (KVM, iDRAC, iLO, etc.)
- Kiểm tra script và service như trên
- Có thể xóa script và cấu hình thủ công nếu cần

**Cách 2: Dùng WinRM (Khuyến nghị - Script tự động enable):**

✨ **Tính năng mới:** Script giờ tự động enable WinRM để có thể remote qua PowerShell nếu RDP bị lỗi!

**Kiểm tra WinRM đã enable chưa:**
```bash
# Kiểm tra port WinRM
nc -zv 159.223.78.17 5985
nc -zv 159.223.78.17 5986
```

**Kết nối qua WinRM:**
```powershell
# Kết nối qua WinRM (port 5985 hoặc 5986)
Enter-PSSession -ComputerName 159.223.78.17 -Credential (Get-Credential)

# Hoặc với username/password cụ thể
$cred = Get-Credential
Enter-PSSession -ComputerName 159.223.78.17 -Credential $cred

# Sau đó chạy các lệnh kiểm tra và sửa:
Test-Path "C:\windows-change-rdp-port.bat"
Get-Service TermService
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" -Name PortNumber
```

**Lợi ích của WinRM:**
- ✅ Không bị kick như RDP khi service restart
- ✅ Có thể remote ngay cả khi RDP đang restart
- ✅ Script tự động enable WinRM trước khi thay đổi RDP port
- ✅ Có thể sửa script và cấu hình từ xa

**Cách 3: Đợi script tự chạy xong (Khuyến nghị nếu không có VNC/Console):**
- ⏱️ **Đợi thêm 10-20 phút**
- Script có retry logic (tối đa 5 lần, mỗi lần cách 10 giây)
- Tổng thời gian tối đa: ~1 phút cho retry + thời gian restart service
- Sau đó script sẽ tự xóa
- Kiểm tra port từ máy khác để xác nhận

**Cách 4: Kết nối RDP với port mặc định (3389) tạm thời:**
- Nếu script đang chạy và restart service liên tục
- Có thể thử kết nối với port 3389 (nếu vẫn mở):
  ```bash
  mstsc /v:159.223.78.17:3389
  ```
- Nếu vào được → Có thể xóa script và cấu hình thủ công
- ⚠️ Lưu ý: Vẫn có thể bị kick nếu script đang restart service

#### 4. **Nếu port đã đổi (6969) nhưng vẫn bị kick:**

Có thể RDP service đang không ổn định:

```powershell
# Kiểm tra RDP service
Get-Service TermService

# Nếu service đang restart liên tục, thử:
# 1. Dừng service
Stop-Service TermService -Force

# 2. Đợi 5 giây
Start-Sleep -Seconds 5

# 3. Khởi động lại
Start-Service TermService

# 4. Kiểm tra lại
Get-Service TermService
```

**Lưu ý quan trọng:**
- ⚠️ **Nếu script vẫn còn sau 30 phút** → Có thể script đang bị lỗi hoặc stuck
- 🔍 **Kiểm tra script và service** để xác định vấn đề
- 🛠️ **Có thể cần can thiệp thủ công** nếu script lỗi
- 📝 **Script bình thường sẽ tự xóa** sau khi chạy xong (vài phút)

### Lỗi 4: "Please disable secure boot first"

**Nguyên nhân:** Secure Boot đang bật.

**Giải pháp:**
1. Vào BIOS/UEFI
2. Tìm mục "Secure Boot" hoặc "UEFI Secure Boot"
3. Tắt Secure Boot
4. Lưu và khởi động lại

### Lỗi 4: "Please run as root"

**Nguyên nhân:** Không có quyền root.

**Giải pháp:**
```bash
sudo su
# hoặc
sudo bash reinstall.sh ...
```

### Lỗi 5: ISO không tương thích kiến trúc

**Nguyên nhân:** ISO không khớp với kiến trúc máy (x86_64 vs arm64).

**Giải pháp:**
- Kiểm tra kiến trúc máy: `uname -m`
- Tải đúng ISO cho kiến trúc của máy
- Script sẽ cảnh báo nếu phát hiện không khớp

---

## ❓ FAQ

### Q1: Script có hỗ trợ Windows XP không?

**A:** Không, script chỉ hỗ trợ từ Windows Vista trở lên.

### Q2: Có thể cài Windows trên máy ảo không?

**A:** Có, script hoạt động trên cả máy vật lý và máy ảo (KVM, VMware, VirtualBox, etc.).

### Q3: Mất mật khẩu thì làm sao?

**A:** 
- Mật khẩu được lưu trong `/reinstall.log` (nếu không dùng `--password`)
- Hoặc xem trong quá trình chạy script
- Nếu đã mất, cần cài lại hoặc dùng công cụ reset password Windows

### Q4: Có thể cài Windows trên máy ARM không?

**A:** Có, nhưng chỉ một số phiên bản Windows hỗ trợ ARM64:
- Windows 11: Hầu hết các edition
- Windows 10: Một số edition (home, pro, enterprise, iot enterprise, ltsc 2021)

### Q5: Script có tự động kích hoạt Windows không?

**A:** Không, script chỉ cài đặt Windows. Bạn cần tự kích hoạt bằng key bản quyền.

### Q6: Có thể cài Windows từ Windows không?

**A:** Có, script cũng hỗ trợ chạy từ Windows (qua Cygwin), nhưng hướng dẫn này tập trung vào cài từ Linux.

### Q7: Làm sao biết script đang làm gì?

**A:** 
- Xem log realtime trong terminal
- Xem log file: `/reinstall.log` (mật khẩu đã được lọc)
- Dùng `--debug` hoặc `-x` để xem chi tiết

### Q8: Sau khi chạy script xong thì sao?

**A:** 

**Bước 1: Reboot máy**
```bash
reboot
```

**Bước 2: Máy sẽ tự động boot vào Windows PE**
- Máy sẽ tự động boot vào Windows PE (không cần chọn gì)
- Nếu có nhiều boot entry, chọn entry có tên "reinstall" hoặc "Windows Installer"

**Bước 3: Quá trình cài đặt tự động**
- Windows PE sẽ tự động:
  1. Load driver từ `X:\drivers\`
  2. Phân vùng lại ổ cứng (nếu cần)
  3. Chạy `setup.exe` với autounattend.xml
  4. Cài đặt Windows tự động (không cần tương tác)

**Bước 4: Đợi cài đặt hoàn tất**
- Quá trình cài đặt thường mất **15-30 phút**
- Máy sẽ tự động reboot nhiều lần trong quá trình cài
- **KHÔNG** tắt máy hoặc interrupt quá trình

**Bước 5: Windows khởi động lần đầu**
- Sau khi cài xong, Windows sẽ khởi động lần đầu
- Các script post-installation sẽ chạy tự động:
  - Cấu hình mạng
  - Đặt RDP port (nếu có `--rdp-port`)
  - Cho phép Ping (nếu có `--allow-ping`)

**Bước 6: Đăng nhập Windows**
- Username: `Administrator`
- Password: Mật khẩu bạn đã đặt (hoặc mật khẩu ngẫu nhiên trong log)
- RDP port: 3389 (mặc định) hoặc port bạn đã đặt (ví dụ: 6969)

**⚠️ Lưu ý quan trọng:**
- **KHÔNG** tắt máy trong quá trình cài đặt
- **KHÔNG** interrupt quá trình boot
- Nếu mất kết nối SSH, đợi 15-30 phút rồi thử kết nối lại
- Nếu có VNC/Console, có thể theo dõi quá trình cài đặt

### Q9: Có thể hủy quá trình cài đặt không?

**A:** 
- Trước khi reboot: Có thể, chỉ cần không reboot
- Sau khi reboot: Không, phải đợi cài xong hoặc cài lại Linux

### Q10: Script có an toàn không?

**A:** 
- Script là mã nguồn mở, bạn có thể xem code
- Tải từ GitHub chính thức: https://github.com/yanteams/windows-installer
- Không tải từ nguồn không rõ nguồn gốc

---

## 📝 Lưu ý quan trọng

1. **Backup dữ liệu:** Script sẽ format ổ cứng, đảm bảo đã backup dữ liệu quan trọng

2. **Kiểm tra kết nối mạng:** Đảm bảo máy có kết nối Internet ổn định

3. **Thời gian cài đặt:** 
   - Tải ISO: Tùy tốc độ mạng (có thể vài phút đến vài giờ)
   - Cài đặt Windows: Thường 15-30 phút

4. **Log file:** Mật khẩu trong `/reinstall.log` đã được lọc, nhưng vẫn nên xóa sau khi cài xong

5. **Kiến trúc:** Đảm bảo ISO khớp với kiến trúc máy (x86_64 hoặc aarch64)

---

## 🔗 Tài liệu tham khảo

- **GitHub Repository:** https://github.com/yanteams/windows-installer
- **Massgrave.dev:** https://massgrave.dev (Nguồn ISO Windows)
- **Hướng dẫn đầy đủ:** Chạy `./reinstall.sh --help`

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:

1. Xem log: `/reinstall.log`
2. Chạy với `--debug` để xem chi tiết
3. Tạo issue trên GitHub: https://github.com/yanteams/windows-installer/issues
4. Kiểm tra FAQ ở trên

---

**Chúc bạn cài đặt thành công! 🎉**

