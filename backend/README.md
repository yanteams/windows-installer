# Hệ thống theo dõi tiến trình cài đặt Windows

Hệ thống backend realtime để theo dõi tiến trình cài đặt Windows qua giao diện web.

## Tính năng

- ✅ Theo dõi tiến trình realtime qua WebSocket
- ✅ Hiển thị phần trăm tiến trình và bước hiện tại
- ✅ Nhật ký cài đặt realtime
- ✅ Hiển thị thời gian bắt đầu và thời gian đã trôi qua
- ✅ Giao diện web đẹp và responsive

## Cài đặt

### Yêu cầu

- Node.js >= 14.0.0
- npm hoặc yarn

### Cài đặt dependencies

```bash
cd backend
npm install
```

## Sử dụng

### Khởi động server

```bash
# Sử dụng port mặc định (8080)
npm start

# Hoặc chỉ định port
PROGRESS_PORT=3000 npm start

# Hoặc sử dụng script khởi động
../start-progress-server.sh
```

### Truy cập dashboard

Mở trình duyệt và truy cập:
- `http://localhost:8080` (port mặc định)
- `http://<IP_SERVER>:8080` (từ máy khác)

## API

### POST /api/progress

Cập nhật tiến trình cài đặt.

**Request Body:**
```json
{
  "step": "Đang tải ISO Windows",
  "progress": 25,
  "status": "running",
  "message": "Đang tải file ISO..."
}
```

**Response:**
```json
{
  "success": true
}
```

### GET /api/progress

Lấy trạng thái tiến trình hiện tại.

**Response:**
```json
{
  "status": "running",
  "currentStep": "Đang tải ISO Windows",
  "progress": 25,
  "totalSteps": 0,
  "logs": [
    {
      "timestamp": "2024-01-01T00:00:00.000Z",
      "message": "Bắt đầu quá trình cài đặt..."
    }
  ],
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": null,
  "error": null
}
```

### POST /api/reset

Reset trạng thái tiến trình.

**Response:**
```json
{
  "success": true
}
```

## WebSocket

Server hỗ trợ WebSocket để cập nhật realtime. Kết nối tới:
```
ws://localhost:8080
```

Server sẽ gửi JSON message mỗi khi có cập nhật tiến trình.

## Tích hợp với script cài đặt

Script `reinstall.sh` và `trans.sh` đã được tích hợp để tự động báo cáo tiến trình nếu server đang chạy.

Để bật tính năng này, đảm bảo:
1. Backend server đang chạy
2. Biến môi trường `PROGRESS_PORT` được set (mặc định 8080)

Script sẽ tự động phát hiện và gửi cập nhật tiến trình tới server.

## Cấu hình

### Biến môi trường

- `PROGRESS_PORT`: Port để chạy server (mặc định: 8080)
- `PROGRESS_LOG`: Đường dẫn tới file log (mặc định: /reinstall.log)

## Troubleshooting

### Server không khởi động

- Kiểm tra Node.js đã được cài đặt: `node --version`
- Kiểm tra port đã được sử dụng: `netstat -tuln | grep 8080`
- Kiểm tra quyền truy cập file log

### Không nhận được cập nhật

- Đảm bảo `PROGRESS_PORT` được set đúng
- Kiểm tra firewall không chặn port
- Kiểm tra script có quyền gửi HTTP request

## License

MIT

