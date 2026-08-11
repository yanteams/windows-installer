#!/bin/sh
# debian ubuntu redhat 安装模式共用此脚本
# alpine 未用到此脚本

# 小于该容量的硬盘不可能是系统盘
# 部分厂商会挂载几百 KiB ~ 几十 MiB 的元数据盘/配置盘
MIN_INSTALLABLE_DISK_MB=2048

get_all_disks() {
    # shellcheck disable=SC2010
    ls /sys/block/ | grep -Ev '^(loop|sr|nbd)'
}

get_disk_size_mb() {
    # /sys/block/xxx/size 的单位固定为 512 字节，与硬盘真实扇区大小无关
    echo $(($(cat "/sys/block/$1/size" 2>/dev/null || echo 0) / 2048))
}

is_disk_installable() {
    [ "$(get_disk_size_mb "$1")" -ge "$MIN_INSTALLABLE_DISK_MB" ]
}

get_xda() {
    # 如果没找到 main_disk 或 xda
    # 返回假的值，防止意外地格式化全部盘
    eval "$(grep -o 'extra_main_disk=[^ ]*' /proc/cmdline | sed 's/^extra_//')"
    eval "$(grep -o 'extra_force_xda=[^ ]*' /proc/cmdline | sed 's/^extra_//')"

    # 用户用 --main-disk 指定了设备名
    if [ -n "$force_xda" ] && [ -b "/dev/${force_xda#/dev/}" ]; then
        echo "${force_xda#/dev/}"
        return
    fi

    if [ -z "$main_disk" ]; then
        echo 'MAIN_DISK_NOT_FOUND'
        return 1
    fi

    # 第一轮只看容量足够的盘，防止选中厂商的元数据盘/配置盘
    # 第二轮才看全部盘，避免小硬盘的机器装不了
    for round in installable all; do
        for disk in $(get_all_disks); do
            if [ "$round" = installable ] && ! is_disk_installable "$disk"; then
                continue
            fi
            if [ "$round" = all ] && is_disk_installable "$disk"; then
                continue
            fi
            if fdisk -l "/dev/$disk" | grep -iq "$main_disk"; then
                echo "$disk"
                return
            fi
        done
    done

    echo 'XDA_NOT_FOUND'
    return 1
}

get_xda
