@echo off
mode con cp select=437 >nul

rem Enable WinRM để có thể remote qua PowerShell nếu RDP bị lỗi
rem WinRM cho phép kết nối từ xa qua PowerShell mà không cần RDP

echo Enabling WinRM for remote PowerShell access...

rem Kiểm tra WinRM service có tồn tại không
sc query WinRM >nul 2>&1
if %errorlevel% == 1060 (
    echo WinRM service not available on this Windows version, skipping...
    goto :del
)

rem Enable WinRM với quickconfig
echo Configuring WinRM...
winrm quickconfig -force -q >nul 2>&1

rem Cấu hình WinRM để chấp nhận kết nối từ xa
echo Setting WinRM authentication...
winrm set winrm/config/service/auth @{Basic="true"} >nul 2>&1
winrm set winrm/config/service @{AllowUnencrypted="true"} >nul 2>&1

rem Cấu hình listener HTTP (port 5985)
echo Configuring WinRM HTTP listener...
winrm create winrm/config/Listener?Address=*+Transport=HTTP >nul 2>&1

rem Mở firewall cho WinRM
echo Opening firewall for WinRM...
netsh advfirewall firewall delete rule name="WinRM HTTP" >nul 2>&1
netsh advfirewall firewall delete rule name="WinRM HTTPS" >nul 2>&1
netsh advfirewall firewall add rule name="WinRM HTTP" dir=in action=allow protocol=TCP localport=5985 >nul 2>&1
netsh advfirewall firewall add rule name="WinRM HTTPS" dir=in action=allow protocol=TCP localport=5986 >nul 2>&1

rem Khởi động WinRM service
echo Starting WinRM service...
net start WinRM >nul 2>&1

rem Kiểm tra service đã chạy chưa
sc query WinRM | find "RUNNING" >nul
if %errorlevel% == 0 (
    echo WinRM enabled successfully!
    echo - HTTP: port 5985
    echo - HTTPS: port 5986
    echo You can now connect via PowerShell: Enter-PSSession -ComputerName IP -Credential (Get-Credential)
) else (
    echo Warning: WinRM service may not be running properly.
)

:del
del "%~f0"
exit /b

