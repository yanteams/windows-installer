@echo off
mode con cp select=437 >nul

rem set RdpPort=3333

rem https://learn.microsoft.com/windows-server/remote/remote-desktop-services/clients/change-listening-port
rem HKLM\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\FirewallRules

rem RemoteDesktop-Shadow-In-TCP
rem v2.33|Action=Allow|Active=TRUE|Dir=In|Protocol=6|App=%SystemRoot%\system32\RdpSa.exe|Name=@FirewallAPI.dll,-28778|Desc=@FirewallAPI.dll,-28779|EmbedCtxt=@FirewallAPI.dll,-28752|Edge=TRUE|Defer=App|

rem RemoteDesktop-UserMode-In-TCP
rem v2.33|Action=Allow|Active=TRUE|Dir=In|Protocol=6|LPort=3389|App=%SystemRoot%\system32\svchost.exe|Svc=termservice|Name=@FirewallAPI.dll,-28775|Desc=@FirewallAPI.dll,-28756|EmbedCtxt=@FirewallAPI.dll,-28752|

rem RemoteDesktop-UserMode-In-UDP
rem v2.33|Action=Allow|Active=TRUE|Dir=In|Protocol=17|LPort=3389|App=%SystemRoot%\system32\svchost.exe|Svc=termservice|Name=@FirewallAPI.dll,-28776|Desc=@FirewallAPI.dll,-28777|EmbedCtxt=@FirewallAPI.dll,-28752|

rem Enable WinRM trước để có thể remote nếu RDP bị lỗi
call :enable_winrm

rem 设置端口
reg add "HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp" /v PortNumber /t REG_DWORD /d %RdpPort% /f

rem 设置防火墙
rem 各个版本的防火墙自带的 rdp 规则略有不同
rem 全部版本都有: program=%SystemRoot%\system32\svchost.exe service=TermService
rem win7 还有:    program=System                            service=
rem 以下为并集
for %%a in (TCP, UDP) do (
    netsh advfirewall firewall add rule ^
        name="Remote Desktop - Custom Port (%%a-In)" ^
        dir=in ^
        action=allow ^
        service=any ^
        protocol=%%a ^
        localport=%RdpPort%
)

rem 家庭版没有 rdp 服务
sc query TermService
if %errorlevel% == 1060 goto :del

rem Kiểm tra xem có active RDP session không
call :check_rdp_sessions
if %hasActiveSessions% == 1 (
    rem Có session đang active, đợi một chút rồi thử lại
    echo Waiting for active RDP sessions to disconnect...
    timeout /t 30 /nobreak >nul
    call :check_rdp_sessions
    if %hasActiveSessions% == 1 (
        rem Vẫn có session, đợi thêm
        echo Still have active sessions, waiting more...
        timeout /t 60 /nobreak >nul
    )
)

rem 重启服务 可以用 sc 或者 net
rem UmRdpService 依赖 TermService
rem sc stop 不能处理依赖关系，因此 sc stop TermService 前需要 sc stop UmRdpService
rem net stop 可以处理依赖关系
rem sc stop 是异步的，net stop 不是异步，但有 timeout 时间
rem TermService 运行后，UmRdpService 会自动运行

rem 如果刚好系统在启动 rdp 服务，则会失败，因此要用 goto 循环
rem The Remote Desktop Services service could not be stopped.

rem 有的机器会死循环，开机 logo 不断转圈
rem 通过 netstat netstat -ano 可以看到端口已修改成功，但rdp服务不断重启 (pid一直改变)
rem 因此限定重试次数避免死循环

set retryCount=3
set maxWaitTime=300

:restartRDP
if %retryCount% LEQ 0 (
    echo Failed to restart RDP service after multiple attempts.
    echo Port has been changed to %RdpPort%, but service restart failed.
    echo You may need to manually restart the service or reboot.
    goto :del
)

rem Thử restart với timeout
net stop TermService /y >nul 2>&1
if %errorlevel% == 0 (
    timeout /t 3 /nobreak >nul
    net start TermService >nul 2>&1
    if %errorlevel% == 0 (
        rem Thành công, đợi service khởi động hoàn toàn
        timeout /t 5 /nobreak >nul
        goto :verify
    )
)

rem Thất bại, retry
set /a retryCount-=1
echo Retrying RDP service restart... (%retryCount% attempts left)
timeout /t 15 /nobreak >nul
goto :restartRDP

:verify
rem Kiểm tra service đã chạy chưa
sc query TermService | find "RUNNING" >nul
if %errorlevel% == 0 (
    echo RDP service restarted successfully on port %RdpPort%
    goto :del
) else (
    rem Service chưa chạy, retry
    set /a retryCount-=1
    if %retryCount% GTR 0 (
        timeout /t 10 /nobreak >nul
        goto :restartRDP
    ) else (
        echo Warning: RDP service may not be running properly.
        echo Port has been changed to %RdpPort%.
        goto :del
    )
)

:del
del "%~f0"
exit /b

:check_rdp_sessions
rem Kiểm tra xem có active RDP session không
set hasActiveSessions=0
for /f "tokens=2" %%a in ('query session 2^>nul ^| find /c /i "Active"') do (
    if %%a GTR 0 set hasActiveSessions=1
)
exit /b

:enable_winrm
rem Enable WinRM để có thể remote qua PowerShell nếu RDP bị lỗi
echo Enabling WinRM for remote access...

rem Kiểm tra WinRM service
sc query WinRM >nul 2>&1
if %errorlevel% == 1060 (
    echo WinRM service not available, skipping...
    exit /b
)

rem Enable WinRM
winrm quickconfig -force -q >nul 2>&1

rem Cấu hình WinRM để chấp nhận kết nối từ xa
winrm set winrm/config/service/auth @{Basic="true"} >nul 2>&1
winrm set winrm/config/service @{AllowUnencrypted="true"} >nul 2>&1

rem Mở firewall cho WinRM
netsh advfirewall firewall add rule name="WinRM HTTP" dir=in action=allow protocol=TCP localport=5985 >nul 2>&1
netsh advfirewall firewall add rule name="WinRM HTTPS" dir=in action=allow protocol=TCP localport=5986 >nul 2>&1

rem Khởi động WinRM service
net start WinRM >nul 2>&1

echo WinRM enabled on ports 5985 (HTTP) and 5986 (HTTPS)
exit /b
