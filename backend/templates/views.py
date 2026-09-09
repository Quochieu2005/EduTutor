import logging
import re
import secrets
from datetime import datetime, timedelta, timezone

from django.conf import settings
from django.contrib import messages
from django.core.mail import send_mail
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from mongoengine import NotUniqueError, ValidationError

from accounts.documents import Admin, PasswordResetOTP


logger = logging.getLogger(__name__)


MANAGEMENT_PAGES = {
    'slides': {
        'title': 'Quản lý Slides', 'group': 'Nội dung', 'singular': 'slide',
        'description': 'Quản lý banner và nội dung trình chiếu trên trang chủ.',
        'columns': [('title', 'Tiêu đề'), ('position', 'Vị trí'), ('link', 'Liên kết'), ('status', 'Trạng thái')],
        'statuses': ['Published', 'Draft', 'Inactive'],
        'rows': [
            ('Khám phá gia sư phù hợp', 'Trang chủ · 1', '/find-tutor/', 'Published'),
            ('Học trực tuyến linh hoạt', 'Trang chủ · 2', '/online-learning/', 'Published'),
            ('Ưu đãi khóa học mới', 'Trang chủ · 3', '/promotions/', 'Draft'),
            ('Gia sư chất lượng cao', 'Ứng dụng · 1', '/tutors/', 'Inactive'),
        ],
    },
    'contacts': {
        'title': 'Liên hệ', 'group': 'Nội dung', 'singular': 'liên hệ',
        'description': 'Tiếp nhận và xử lý yêu cầu liên hệ từ người dùng.',
        'columns': [('name', 'Người gửi'), ('email', 'Email'), ('subject', 'Chủ đề'), ('status', 'Trạng thái')],
        'statuses': ['New', 'Processing', 'Resolved'],
        'rows': [
            ('Nguyễn Hải An', 'haian@example.com', 'Tư vấn tìm gia sư Toán', 'New'),
            ('Trần Minh Khoa', 'minhkhoa@example.com', 'Hỗ trợ thanh toán', 'Processing'),
            ('Lê Ngọc Trâm', 'ngoctram@example.com', 'Thay đổi lịch học', 'Resolved'),
            ('Phạm Anh Tú', 'anhtu@example.com', 'Đăng ký làm gia sư', 'New'),
        ],
    },
    'blog': {
        'title': 'Quản lý Blog', 'group': 'Nội dung', 'singular': 'bài viết',
        'description': 'Biên tập và xuất bản nội dung kiến thức của EduTutor.',
        'columns': [('title', 'Tiêu đề'), ('author', 'Tác giả'), ('category', 'Danh mục'), ('status', 'Trạng thái')],
        'statuses': ['Published', 'Draft', 'Review'],
        'rows': [
            ('5 cách học Toán hiệu quả', 'Admin EduTutor', 'Kinh nghiệm học tập', 'Published'),
            ('Chọn gia sư phù hợp cho con', 'Nguyễn Hà', 'Dành cho phụ huynh', 'Published'),
            ('Bí quyết dạy học trực tuyến', 'Trần Nam', 'Dành cho gia sư', 'Review'),
            ('Lộ trình IELTS từ con số 0', 'Lê Anh', 'Ngoại ngữ', 'Draft'),
        ],
    },
    'tutor-jobs': {
        'title': 'Tin tuyển dụng gia sư', 'group': 'Tuyển dụng', 'singular': 'tin tuyển dụng',
        'description': 'Đăng và quản lý nhu cầu tuyển gia sư theo môn học, khu vực.',
        'columns': [('title', 'Vị trí tuyển dụng'), ('subject', 'Môn học'), ('area', 'Khu vực'), ('vacancies', 'Số lượng'), ('deadline', 'Hạn ứng tuyển'), ('status', 'Trạng thái')],
        'statuses': ['Published', 'Draft', 'Closed'],
        'rows': [
            ('Gia sư Toán THPT', 'Toán học', 'TP.HCM', '8', '20/09/2026', 'Published'),
            ('Gia sư IELTS 7.0+', 'Tiếng Anh', 'Online', '5', '18/09/2026', 'Published'),
            ('Gia sư Vật lý lớp 10-12', 'Vật lý', 'Hà Nội', '4', '25/09/2026', 'Draft'),
            ('Gia sư Tiếng Nhật N3', 'Tiếng Nhật', 'Đà Nẵng', '2', '10/09/2026', 'Closed'),
        ],
    },
    'tutor-candidates': {
        'title': 'Ứng viên gia sư', 'group': 'Tuyển dụng', 'singular': 'ứng viên',
        'description': 'Quản lý ứng viên, CV và tiến độ tham gia quy trình tuyển dụng.',
        'columns': [('candidate', 'Ứng viên'), ('email', 'Email'), ('subject', 'Chuyên môn'), ('experience', 'Kinh nghiệm'), ('applied', 'Ngày ứng tuyển'), ('status', 'Trạng thái')],
        'statuses': ['New', 'Screening', 'Interview', 'Rejected'],
        'rows': [
            ('Trần Hoàng Nam', 'hoangnam@example.com', 'Toán THPT', '4 năm', '04/09/2026', 'Screening'),
            ('Phạm Quốc Bảo', 'quocbao@example.com', 'IELTS', '6 năm', '03/09/2026', 'Interview'),
            ('Võ Ngọc Lan', 'ngoclan@example.com', 'Vật lý', '3 năm', '04/09/2026', 'New'),
            ('Nguyễn Thảo Vy', 'thaovy@example.com', 'Ngữ văn', '2 năm', '01/09/2026', 'Rejected'),
        ],
    },
    'tutor-approvals': {
        'title': 'Duyệt hồ sơ gia sư', 'group': 'Tuyển dụng', 'singular': 'hồ sơ gia sư',
        'description': 'Kiểm tra hồ sơ, bằng cấp và phê duyệt gia sư mới.',
        'columns': [('applicant', 'Ứng viên'), ('subject', 'Chuyên môn'), ('experience', 'Kinh nghiệm'), ('submitted', 'Ngày gửi'), ('status', 'Trạng thái')],
        'statuses': ['Pending', 'Approved', 'Rejected'],
        'rows': [
            ('Trần Hoàng Nam', 'Toán THPT', '4 năm', '04/09/2026', 'Pending'),
            ('Phạm Quốc Bảo', 'Tiếng Anh', '6 năm', '03/09/2026', 'Approved'),
            ('Võ Ngọc Lan', 'Vật lý', '3 năm', '02/09/2026', 'Pending'),
            ('Nguyễn Thảo Vy', 'Ngữ văn', '2 năm', '01/09/2026', 'Rejected'),
        ],
    },
    'tutor-interviews': {
        'title': 'Phỏng vấn & Dạy thử', 'group': 'Tuyển dụng', 'singular': 'lịch phỏng vấn',
        'description': 'Xếp lịch phỏng vấn, buổi dạy thử và ghi nhận kết quả đánh giá.',
        'columns': [('candidate', 'Ứng viên'), ('round', 'Vòng đánh giá'), ('interviewer', 'Người phụ trách'), ('schedule', 'Thời gian'), ('score', 'Điểm'), ('status', 'Trạng thái')],
        'statuses': ['Scheduled', 'Completed', 'Passed', 'Failed'],
        'rows': [
            ('Phạm Quốc Bảo', 'Phỏng vấn chuyên môn', 'Manager An', '06/09/2026 09:00', '-', 'Scheduled'),
            ('Trần Hoàng Nam', 'Dạy thử', 'Manager Linh', '05/09/2026 14:30', '8.5/10', 'Passed'),
            ('Võ Ngọc Lan', 'Phỏng vấn hồ sơ', 'Manager An', '07/09/2026 10:00', '-', 'Scheduled'),
            ('Lê Minh Tuấn', 'Dạy thử', 'Manager Linh', '02/09/2026 15:00', '5.0/10', 'Failed'),
        ],
    },
    'tutor-onboarding': {
        'title': 'Tiếp nhận gia sư', 'group': 'Tuyển dụng', 'singular': 'hồ sơ tiếp nhận',
        'description': 'Hoàn thiện hợp đồng, giấy tờ và tài khoản cho ứng viên đã trúng tuyển.',
        'columns': [('tutor', 'Gia sư'), ('contract', 'Hợp đồng'), ('documents', 'Giấy tờ'), ('account', 'Tài khoản'), ('start_date', 'Ngày bắt đầu'), ('status', 'Trạng thái')],
        'statuses': ['Pending', 'Processing', 'Completed'],
        'rows': [
            ('Trần Hoàng Nam', 'Đã ký', 'Đầy đủ', 'Đã tạo', '08/09/2026', 'Completed'),
            ('Phạm Quốc Bảo', 'Chờ ký', 'Đầy đủ', 'Chưa tạo', '10/09/2026', 'Processing'),
            ('Võ Ngọc Lan', 'Chưa gửi', 'Thiếu CCCD', 'Chưa tạo', '12/09/2026', 'Pending'),
            ('Hoàng Minh Đức', 'Đã ký', 'Đang xác minh', 'Chưa tạo', '09/09/2026', 'Processing'),
        ],
    },
    'tutors-by-area': {
        'title': 'Quản lý gia sư', 'group': 'Quản lý', 'singular': 'gia sư',
        'description': 'Quản lý gia sư đã được tuyển, chuyên môn, khu vực và trạng thái hoạt động.',
        'columns': [('tutor', 'Gia sư'), ('subject', 'Môn học'), ('area', 'Khu vực'), ('mode', 'Hình thức'), ('status', 'Trạng thái')],
        'statuses': ['Active', 'Inactive', 'Available'],
        'rows': [
            ('Trần Hoàng Nam', 'Toán', 'Quận 1, TP.HCM', 'Online & Offline', 'Available'),
            ('Phạm Quốc Bảo', 'Tiếng Anh', 'Thủ Đức, TP.HCM', 'Online', 'Active'),
            ('Võ Ngọc Lan', 'Vật lý', 'Cầu Giấy, Hà Nội', 'Offline', 'Available'),
            ('Lê Minh Tuấn', 'Hóa học', 'Hải Châu, Đà Nẵng', 'Online', 'Inactive'),
        ],
    },
    'classes': {
        'title': 'Quản lý lớp học', 'group': 'Quản lý', 'singular': 'lớp học',
        'description': 'Quản lý lớp, gia sư, học viên và tiến độ học tập.',
        'columns': [('code', 'Mã lớp'), ('subject', 'Môn học'), ('tutor', 'Gia sư'), ('student', 'Học viên'), ('status', 'Trạng thái')],
        'statuses': ['Active', 'Completed', 'Cancelled'],
        'rows': [
            ('CLS-1001', 'Toán 12', 'Trần Hoàng Nam', 'Nguyễn Minh Anh', 'Active'),
            ('CLS-1002', 'IELTS 6.5', 'Phạm Quốc Bảo', 'Lê Thu Hà', 'Active'),
            ('CLS-1003', 'Vật lý 11', 'Võ Ngọc Lan', 'Trần Gia Huy', 'Completed'),
            ('CLS-1004', 'Hóa học 10', 'Lê Minh Tuấn', 'Đỗ Quang Minh', 'Cancelled'),
        ],
    },
    'schedules': {
        'title': 'Lịch học & Lịch biểu', 'group': 'Quản lý', 'singular': 'lịch học',
        'description': 'Sắp xếp và theo dõi các buổi học trên toàn hệ thống.',
        'columns': [('class_code', 'Mã lớp'), ('date', 'Ngày học'), ('time', 'Thời gian'), ('location', 'Địa điểm'), ('status', 'Trạng thái')],
        'statuses': ['Scheduled', 'Completed', 'Cancelled'],
        'rows': [
            ('CLS-1001', '05/09/2026', '19:00 - 20:30', 'Google Meet', 'Scheduled'),
            ('CLS-1002', '05/09/2026', '20:00 - 21:30', 'Zoom', 'Scheduled'),
            ('CLS-1003', '04/09/2026', '18:00 - 19:30', 'Cầu Giấy, Hà Nội', 'Completed'),
            ('CLS-1004', '03/09/2026', '17:30 - 19:00', 'Google Meet', 'Cancelled'),
        ],
    },
    'subjects': {
        'title': 'Môn học & Chuyên môn', 'group': 'Quản lý', 'singular': 'môn học',
        'description': 'Quản lý danh mục môn học và số lượng gia sư phụ trách.',
        'columns': [('subject', 'Môn học'), ('level', 'Cấp độ'), ('tutors', 'Số gia sư'), ('category', 'Danh mục'), ('status', 'Trạng thái')],
        'statuses': ['Active', 'Inactive'],
        'rows': [
            ('Toán học', 'Lớp 6 - 12', '42', 'Khoa học tự nhiên', 'Active'),
            ('Tiếng Anh', 'Cơ bản - IELTS', '38', 'Ngoại ngữ', 'Active'),
            ('Vật lý', 'Lớp 8 - 12', '21', 'Khoa học tự nhiên', 'Active'),
            ('Tiếng Nhật', 'N5 - N2', '7', 'Ngoại ngữ', 'Inactive'),
        ],
    },
    'tutor-requests': {
        'title': 'Yêu cầu tìm gia sư', 'group': 'Quản lý', 'singular': 'yêu cầu',
        'description': 'Ghép nhu cầu học tập của học viên với gia sư phù hợp.',
        'columns': [('student', 'Học viên'), ('subject', 'Môn học'), ('area', 'Khu vực'), ('budget', 'Ngân sách'), ('status', 'Trạng thái')],
        'statuses': ['New', 'Processing', 'Matched', 'Cancelled'],
        'rows': [
            ('Nguyễn Minh Anh', 'Toán 12', 'Quận 1, TP.HCM', '250.000đ/buổi', 'New'),
            ('Lê Thu Hà', 'IELTS', 'Online', '300.000đ/buổi', 'Processing'),
            ('Trần Gia Huy', 'Vật lý 11', 'Cầu Giấy, Hà Nội', '220.000đ/buổi', 'Matched'),
            ('Phạm Ngọc Mai', 'Ngữ văn 9', 'Hải Châu, Đà Nẵng', '180.000đ/buổi', 'Cancelled'),
        ],
    },
    'payments': {
        'title': 'Thanh toán & Hoa hồng', 'group': 'Vận hành', 'singular': 'giao dịch',
        'description': 'Theo dõi học phí, hoa hồng nền tảng và hoàn tiền.',
        'columns': [('code', 'Mã giao dịch'), ('student', 'Học viên'), ('tutor', 'Gia sư'), ('amount', 'Số tiền'), ('commission', 'Hoa hồng'), ('status', 'Trạng thái')],
        'statuses': ['Paid', 'Pending', 'Refunded', 'Failed'],
        'rows': [
            ('PAY-26090401', 'Nguyễn Minh Anh', 'Trần Hoàng Nam', '1.500.000đ', '150.000đ', 'Paid'),
            ('PAY-26090402', 'Lê Thu Hà', 'Phạm Quốc Bảo', '1.800.000đ', '180.000đ', 'Pending'),
            ('PAY-26090308', 'Trần Gia Huy', 'Võ Ngọc Lan', '1.320.000đ', '132.000đ', 'Refunded'),
            ('PAY-26090211', 'Đỗ Quang Minh', 'Lê Minh Tuấn', '900.000đ', '90.000đ', 'Failed'),
        ],
    },
    'reviews-complaints': {
        'title': 'Đánh giá & Khiếu nại', 'group': 'Vận hành', 'singular': 'phản hồi',
        'description': 'Kiểm duyệt đánh giá và xử lý tranh chấp giữa người dùng.',
        'columns': [('sender', 'Người gửi'), ('target', 'Đối tượng'), ('type', 'Loại'), ('content', 'Nội dung'), ('status', 'Trạng thái')],
        'statuses': ['New', 'Processing', 'Resolved', 'Rejected'],
        'rows': [
            ('Nguyễn Minh Anh', 'Trần Hoàng Nam', 'Đánh giá', 'Gia sư nhiệt tình, đúng giờ', 'Resolved'),
            ('Lê Thu Hà', 'Lớp CLS-1002', 'Khiếu nại', 'Buổi học kết thúc sớm', 'Processing'),
            ('Phạm Quốc Bảo', 'Học viên 1042', 'Báo cáo', 'Không tham gia buổi học', 'New'),
            ('Trần Gia Huy', 'Võ Ngọc Lan', 'Đánh giá', 'Nội dung không phù hợp', 'Rejected'),
        ],
    },
    'notifications': {
        'title': 'Thông báo hệ thống', 'group': 'Vận hành', 'singular': 'thông báo',
        'description': 'Tạo và gửi thông báo đến từng nhóm người dùng.',
        'columns': [('title', 'Tiêu đề'), ('audience', 'Người nhận'), ('channel', 'Kênh'), ('scheduled', 'Thời gian'), ('status', 'Trạng thái')],
        'statuses': ['Draft', 'Scheduled', 'Sent', 'Failed'],
        'rows': [
            ('Bảo trì hệ thống', 'Tất cả người dùng', 'App & Email', '06/09/2026 01:00', 'Scheduled'),
            ('Hồ sơ đã được duyệt', 'Gia sư mới', 'App', '04/09/2026 09:30', 'Sent'),
            ('Ưu đãi tháng 9', 'Học viên', 'Email', '07/09/2026 08:00', 'Draft'),
            ('Nhắc lịch học', 'Lớp CLS-1004', 'App', '03/09/2026 16:30', 'Failed'),
        ],
    },
    'activity-logs': {
        'title': 'Nhật ký hoạt động', 'group': 'Vận hành', 'singular': 'nhật ký',
        'description': 'Theo dõi thao tác quản trị và các thay đổi quan trọng.',
        'columns': [('admin', 'Quản trị viên'), ('action', 'Hành động'), ('module', 'Phân hệ'), ('time', 'Thời gian'), ('ip', 'Địa chỉ IP')],
        'statuses': [],
        'rows': [
            ('Guest User', 'Duyệt hồ sơ GS-2041', 'Gia sư', '04/09/2026 13:22', '127.0.0.1'),
            ('Manager An', 'Hoàn tiền PAY-26090308', 'Thanh toán', '04/09/2026 11:08', '192.168.1.20'),
            ('Guest User', 'Cập nhật slide trang chủ', 'Slides', '04/09/2026 09:45', '127.0.0.1'),
            ('Manager Linh', 'Khóa tài khoản user_1092', 'Users', '03/09/2026 17:30', '192.168.1.35'),
        ],
    },
    'administrators': {
        'title': 'Quản lý Admin', 'group': 'Vận hành', 'singular': 'quản trị viên',
        'description': 'Quản lý tài khoản quản trị, vai trò và trạng thái truy cập hệ thống.',
        'columns': [('username', 'Username'), ('name', 'Họ và tên'), ('email', 'Email'), ('role', 'Vai trò'), ('last_login', 'Đăng nhập gần nhất'), ('status', 'Trạng thái')],
        'statuses': ['Active', 'Inactive', 'Locked'],
        'rows': [
            ('admin.guest', 'Guest User', 'admin@edututor.local', 'Super Admin', '04/09/2026 14:20', 'Active'),
            ('manager.an', 'Nguyễn Hoàng An', 'an.manager@edututor.local', 'Tutor Manager', '04/09/2026 13:05', 'Active'),
            ('editor.linh', 'Trần Mỹ Linh', 'linh.editor@edututor.local', 'Content Editor', '04/09/2026 09:42', 'Active'),
            ('support.hoa', 'Lê Thanh Hoa', 'hoa.support@edututor.local', 'Support Agent', '02/09/2026 16:30', 'Inactive'),
            ('manager.tuan', 'Phạm Anh Tuấn', 'tuan.manager@edututor.local', 'Tutor Manager', '30/08/2026 11:10', 'Locked'),
        ],
    },
    'roles-permissions': {
        'title': 'Vai trò & Phân quyền', 'group': 'Vận hành', 'singular': 'vai trò',
        'description': 'Thiết lập vai trò và quyền truy cập của đội ngũ quản trị.',
        'columns': [('role', 'Vai trò'), ('members', 'Thành viên'), ('description', 'Mô tả'), ('updated', 'Cập nhật'), ('status', 'Trạng thái')],
        'statuses': ['Active', 'Inactive'],
        'rows': [
            ('Super Admin', '2', 'Toàn quyền quản trị hệ thống', '04/09/2026', 'Active'),
            ('Tutor Manager', '5', 'Duyệt và quản lý gia sư', '02/09/2026', 'Active'),
            ('Content Editor', '3', 'Quản lý slides và blog', '28/08/2026', 'Active'),
            ('Support Agent', '8', 'Xử lý liên hệ và khiếu nại', '25/08/2026', 'Inactive'),
        ],
    },
}


def _management_status_tone(status):
    value = str(status).lower()
    if any(item in value for item in ('inactive', 'rejected', 'cancelled', 'failed', 'locked')):
        return 'danger'
    if any(item in value for item in ('active', 'approved', 'completed', 'published', 'sent', 'paid', 'passed', 'resolved', 'matched', 'available')):
        return 'success'
    if any(item in value for item in ('pending', 'processing', 'scheduled', 'draft', 'review', 'screening', 'interview')):
        return 'warning'
    if any(item in value for item in ('new', 'refunded')):
        return 'info'
    return 'neutral'


def _admin_role_label(role):
    return 'Super Admin' if role == Admin.ROLE_SUPER_ADMIN else 'Admin'


def _administrator_page_config():
    admins = sorted(
        Admin.objects,
        key=lambda admin: (admin.role != Admin.ROLE_SUPER_ADMIN, admin.name.lower()),
    )
    rows = []
    for admin in admins:
        if not admin.slug:
            admin.save()
        permissions = 'Toàn quyền hệ thống' if admin.role == Admin.ROLE_SUPER_ADMIN else ', '.join(admin.permissions or [])
        manager = admin.managed_by.name if admin.managed_by else '—'
        rows.append((
            str(admin.id),
            admin.name,
            admin.email,
            _admin_role_label(admin.role),
            permissions or 'Chưa cấp quyền',
            manager,
            'Active' if admin.status == Admin.STATUS_ACTIVE else 'Inactive',
        ))

    return {
        'title': 'Quản lý Admin',
        'group': 'Vận hành',
        'singular': 'quản trị viên',
        'description': 'Danh sách tài khoản quản trị đang được lưu trong MongoDB.',
        'columns': [
            ('admin_id', 'ID'),
            ('name', 'Họ và tên'),
            ('email', 'Email'),
            ('role', 'Vai trò'),
            ('permissions', 'Quyền được cấp'),
            ('managed_by', 'Quản lý bởi'),
            ('status', 'Trạng thái'),
        ],
        'statuses': ['Active', 'Inactive'],
        'rows': rows,
        'records': admins,
    }


def _roles_permissions_page_config():
    admins = list(Admin.objects)
    rows = []
    role_definitions = (
        (
            Admin.ROLE_SUPER_ADMIN,
            'Super Admin',
            'Toàn quyền quản trị hệ thống',
            'Toàn quyền hệ thống',
        ),
        (
            Admin.ROLE_ADMIN,
            'Admin',
            'Chỉ được sử dụng những quyền đã được Super Admin cấp',
            None,
        ),
    )

    for role, label, description, fixed_permissions in role_definitions:
        members = [admin for admin in admins if admin.role == role]
        permissions = fixed_permissions
        if permissions is None:
            permissions = ', '.join(sorted({
                permission
                for admin in members
                for permission in (admin.permissions or [])
            })) or 'Chưa cấp quyền'
        status = 'Active' if any(admin.status == Admin.STATUS_ACTIVE for admin in members) else 'Inactive'
        rows.append((label, str(len(members)), description, permissions, status))

    return {
        'title': 'Vai trò & Phân quyền',
        'group': 'Vận hành',
        'singular': 'vai trò',
        'description': 'Tổng hợp vai trò, số Admin và các quyền thực tế trong MongoDB.',
        'columns': [
            ('role', 'Vai trò'),
            ('members', 'Thành viên'),
            ('description', 'Mô tả'),
            ('permissions', 'Quyền'),
            ('status', 'Trạng thái'),
        ],
        'statuses': ['Active', 'Inactive'],
        'rows': rows,
    }


def management_page(request, module):
    if module == 'administrators':
        config = _administrator_page_config()
    elif module == 'roles-permissions':
        config = _roles_permissions_page_config()
    else:
        config = MANAGEMENT_PAGES.get(module)
    if config is None:
        return page_not_found(request)

    page = {
        **config,
        'key': module,
        'action_label': f"Thêm {config['singular']}",
        'can_manage': True,
    }
    if module == 'administrators':
        page['can_manage'] = request.admin_account.role == Admin.ROLE_SUPER_ADMIN
        page['create_url'] = reverse('administrator-create')
        page['manager_options'] = [
            {'slug': admin.slug, 'name': admin.name}
            for admin in Admin.objects(role=Admin.ROLE_SUPER_ADMIN)
            if admin.slug
        ]
    page['columns'] = [{'key': key, 'label': label} for key, label in config['columns']]
    page['rows'] = []
    for index, values in enumerate(config['rows'], start=1):
        cells = []
        for (field, _), value in zip(config['columns'], values):
            cells.append({
                'field': field,
                'value': value,
                'tone': _management_status_tone(value) if field == 'status' else '',
            })
        row = {'id': f'{module}-{index}', 'cells': cells}
        if module == 'administrators':
            admin = config['records'][index - 1]
            row.update({
                'id': admin.slug,
                'slug': admin.slug,
                'edit_url': reverse('administrator-edit', kwargs={'slug': admin.slug}),
                'delete_url': reverse('administrator-delete', kwargs={'slug': admin.slug}),
                'avatar_url': reverse('administrator-avatar', kwargs={'slug': admin.slug}) if admin.profile_image else '',
                'role': admin.role,
                'permissions': ', '.join(admin.permissions or []),
                'managed_by_slug': admin.managed_by.slug if admin.managed_by else '',
                'status_code': str(admin.status),
            })
        page['rows'].append(row)

    page['form_fields'] = []
    for field, label in config['columns']:
        form_field = {'name': field, 'label': label, 'type': 'text', 'placeholder': f'Nhập {label.lower()}'}
        if field == 'status' and config['statuses']:
            form_field['options'] = config['statuses']
        if field in ('content', 'description'):
            form_field.update({'type': 'textarea', 'full': True})
        if field == 'email':
            form_field['type'] = 'email'
        page['form_fields'].append(form_field)

    template_key = module.replace('-', '_')
    return render(request, f'admin/{template_key}/{template_key}.html', {'page': page})


ADMIN_IMAGE_TYPES = {
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
}
ADMIN_IMAGE_MAX_SIZE = 2 * 1024 * 1024


def _admin_management_redirect(request, message, *, error=False):
    (messages.error if error else messages.success)(request, message)
    return redirect('management-page', module='administrators')


def _require_super_admin(request):
    return (
        request.admin_account is not None
        and request.admin_account.role == Admin.ROLE_SUPER_ADMIN
    )


def _admin_form_values(request):
    name = request.POST.get('name', '').strip()
    email = request.POST.get('email', '').strip().lower()
    role = request.POST.get('role', Admin.ROLE_ADMIN)
    status_raw = request.POST.get('status', str(Admin.STATUS_ACTIVE))
    permissions = list(dict.fromkeys(
        item.strip()
        for item in re.split(r'[,\n]+', request.POST.get('permissions', ''))
        if item.strip()
    ))

    if not name or not email:
        raise ValueError('Họ tên và email không được để trống.')
    if role not in Admin.ROLE_CHOICES:
        raise ValueError('Vai trò quản trị không hợp lệ.')
    try:
        status = int(status_raw)
    except (TypeError, ValueError) as exc:
        raise ValueError('Trạng thái quản trị không hợp lệ.') from exc
    if status not in Admin.STATUS_CHOICES:
        raise ValueError('Trạng thái quản trị không hợp lệ.')

    manager = None
    if role == Admin.ROLE_ADMIN:
        manager_slug = request.POST.get('managed_by', '').strip()
        manager = (
            Admin.objects(slug=manager_slug, role=Admin.ROLE_SUPER_ADMIN).first()
            if manager_slug
            else request.admin_account
        )
        if manager is None:
            raise ValueError('Admin thường phải được quản lý bởi một Super Admin.')

    upload = request.FILES.get('profile_image')
    image = None
    if upload:
        if upload.content_type not in ADMIN_IMAGE_TYPES:
            raise ValueError('Ảnh đại diện phải là JPEG, PNG, WEBP hoặc GIF.')
        if upload.size > ADMIN_IMAGE_MAX_SIZE:
            raise ValueError('Ảnh đại diện không được vượt quá 2 MB.')
        image = {
            'data': upload.read(),
            'name': upload.name[:255],
            'content_type': upload.content_type,
        }

    return {
        'name': name,
        'email': email,
        'role': role,
        'status': status,
        'permissions': None if role == Admin.ROLE_SUPER_ADMIN else permissions,
        'managed_by': manager,
        'image': image,
    }


def administrator_create(request):
    if request.method != 'POST':
        return redirect('management-page', module='administrators')
    if not _require_super_admin(request):
        return _admin_management_redirect(request, 'Bạn không có quyền thêm quản trị viên.', error=True)

    password = request.POST.get('password', '')
    password_confirmation = request.POST.get('password_confirmation', '')
    try:
        values = _admin_form_values(request)
        if Admin.objects(email=values['email']).first():
            raise ValueError('Email này đã được sử dụng bởi quản trị viên khác.')
        if len(password) < 8:
            raise ValueError('Mật khẩu phải có ít nhất 8 ký tự.')
        if password != password_confirmation:
            raise ValueError('Mật khẩu xác nhận không khớp.')

        admin = Admin(
            name=values['name'],
            email=values['email'],
            role=values['role'],
            permissions=values['permissions'],
            managed_by=values['managed_by'],
            status=values['status'],
        )
        admin.set_password(password)
        if values['image']:
            admin.profile_image = values['image']['data']
            admin.profile_image_name = values['image']['name']
            admin.profile_image_content_type = values['image']['content_type']
        admin.save(force_insert=True)
    except (ValueError, ValidationError, NotUniqueError) as exc:
        message = str(exc) if isinstance(exc, ValueError) else 'Thông tin quản trị viên không hợp lệ hoặc bị trùng.'
        return _admin_management_redirect(request, message, error=True)

    return _admin_management_redirect(request, f'Đã thêm quản trị viên {admin.name}.')


def administrator_edit(request, slug):
    if request.method != 'POST':
        return redirect('management-page', module='administrators')
    if not _require_super_admin(request):
        return _admin_management_redirect(request, 'Bạn không có quyền sửa quản trị viên.', error=True)

    admin = Admin.objects(slug=slug).first()
    if admin is None:
        return _admin_management_redirect(request, 'Không tìm thấy quản trị viên.', error=True)

    try:
        values = _admin_form_values(request)
        duplicate = Admin.objects(email=values['email'], id__ne=admin.id).first()
        if duplicate:
            raise ValueError('Email này đã được sử dụng bởi quản trị viên khác.')
        if admin.id == request.admin_account.id and (
            values['role'] != Admin.ROLE_SUPER_ADMIN
            or values['status'] != Admin.STATUS_ACTIVE
        ):
            raise ValueError('Bạn không thể hạ vai trò hoặc vô hiệu hóa chính tài khoản đang đăng nhập.')
        if (
            admin.role == Admin.ROLE_SUPER_ADMIN
            and admin.status == Admin.STATUS_ACTIVE
            and (values['role'] != Admin.ROLE_SUPER_ADMIN or values['status'] != Admin.STATUS_ACTIVE)
            and Admin.objects(role=Admin.ROLE_SUPER_ADMIN, status=Admin.STATUS_ACTIVE).count() <= 1
        ):
            raise ValueError('Hệ thống phải còn ít nhất một Super Admin đang hoạt động.')

        password = request.POST.get('password', '')
        password_confirmation = request.POST.get('password_confirmation', '')
        if password:
            if len(password) < 8:
                raise ValueError('Mật khẩu mới phải có ít nhất 8 ký tự.')
            if password != password_confirmation:
                raise ValueError('Mật khẩu xác nhận không khớp.')

        access_changed = (
            admin.role != values['role']
            or admin.status != values['status']
            or admin.permissions != values['permissions']
        )
        admin.name = values['name']
        admin.email = values['email']
        admin.role = values['role']
        admin.status = values['status']
        admin.permissions = values['permissions']
        admin.managed_by = values['managed_by']
        if request.POST.get('remove_profile_image') == '1':
            admin.profile_image = None
            admin.profile_image_name = ''
            admin.profile_image_content_type = ''
        if values['image']:
            admin.profile_image = values['image']['data']
            admin.profile_image_name = values['image']['name']
            admin.profile_image_content_type = values['image']['content_type']
        if password:
            admin.set_password(password)
        if password or access_changed:
            admin.session_version += 1
        admin.save()
    except (ValueError, ValidationError, NotUniqueError) as exc:
        message = str(exc) if isinstance(exc, ValueError) else 'Thông tin quản trị viên không hợp lệ hoặc bị trùng.'
        return _admin_management_redirect(request, message, error=True)

    return _admin_management_redirect(request, f'Đã cập nhật quản trị viên {admin.name}.')


def administrator_delete(request, slug):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    if not _require_super_admin(request):
        return JsonResponse({'ok': False, 'message': 'Bạn không có quyền xóa quản trị viên.'}, status=403)

    admin = Admin.objects(slug=slug).first()
    if admin is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy quản trị viên.'}, status=404)
    if admin.id == request.admin_account.id:
        return JsonResponse({'ok': False, 'message': 'Bạn không thể xóa chính tài khoản đang đăng nhập.'}, status=400)
    if (
        admin.role == Admin.ROLE_SUPER_ADMIN
        and admin.status == Admin.STATUS_ACTIVE
        and Admin.objects(role=Admin.ROLE_SUPER_ADMIN, status=Admin.STATUS_ACTIVE).count() <= 1
    ):
        return JsonResponse({'ok': False, 'message': 'Hệ thống phải còn ít nhất một Super Admin đang hoạt động.'}, status=400)

    name = admin.name
    admin.delete()
    messages.success(request, f'Đã xóa quản trị viên {name}.')
    return JsonResponse({'ok': True})


def administrator_avatar(request, slug):
    admin = Admin.objects(slug=slug).only(
        'profile_image',
        'profile_image_content_type',
    ).first()
    if admin is None or not admin.profile_image:
        return HttpResponse(status=404)
    response = HttpResponse(
        bytes(admin.profile_image),
        content_type=admin.profile_image_content_type or 'application/octet-stream',
    )
    response['Cache-Control'] = 'private, max-age=3600'
    return response


def dashboard(request):
    welcome_email = request.session.pop('dashboard_welcome_email', '')
    return render(request, 'admin/dashboard.html', {'welcome_email': welcome_email})


def users(request):
    return render(request, 'admin/user/users.html')


def chats(request):
    return render(request, 'admin/chat/chats.html')


def students(request):
    return render(request, 'admin/student/students.html')


def profile(request):
    admin = request.admin_account

    if request.method == 'POST':
        submitted_urls = [
            url.strip() for url in request.POST.getlist('urls') if url.strip()
        ]
        submitted = {
            'name': request.POST.get('username', '').strip(),
            'email': admin.email,
            'bio': request.POST.get('bio', '').strip(),
            'urls': submitted_urls,
            'role': 'Super Admin' if admin.role == Admin.ROLE_SUPER_ADMIN else 'Admin',
        }

        if not submitted['name']:
            return render(request, 'admin/setting/profile.html', {
                'profile': submitted,
                'form_error': 'Tên hiển thị không được để trống.',
            }, status=400)

        if len(submitted_urls) != len(set(submitted_urls)):
            return render(request, 'admin/setting/profile.html', {
                'profile': submitted,
                'form_error': 'Danh sách URL đang có địa chỉ bị trùng.',
            }, status=400)

        admin.name = submitted['name']
        admin.bio = submitted['bio']
        admin.urls = submitted['urls']

        try:
            admin.save()
        except NotUniqueError:
            return render(request, 'admin/setting/profile.html', {
                'profile': submitted,
                'form_error': 'Không thể cập nhật Profile lúc này.',
            }, status=409)
        except ValidationError:
            return render(request, 'admin/setting/profile.html', {
                'profile': submitted,
                'form_error': 'URL không đúng định dạng.',
            }, status=400)

        messages.success(request, 'Thông tin Profile đã được cập nhật.')
        return redirect('profile')

    profile_data = {
        'name': admin.name,
        'email': admin.email,
        'role': 'Super Admin' if admin.role == Admin.ROLE_SUPER_ADMIN else 'Admin',
        'bio': admin.bio,
        'urls': admin.urls,
    }
    return render(request, 'admin/setting/profile.html', {'profile': profile_data})


def account_settings(request):
    admin = request.admin_account

    if request.method == 'POST':
        action = request.POST.get('action', 'update_email')
        current_password = request.POST.get('current_password', '')

        if not admin.check_password(current_password):
            return render(request, 'admin/setting/account.html', {
                'account': _account_data(admin),
                'form_error': 'Mật khẩu hiện tại không chính xác.',
            }, status=400)

        if action == 'sign_out_all':
            admin.session_version += 1
            admin.save()
            request.session.flush()
            return redirect('login')

        email = request.POST.get('email', '').strip().lower()
        if not email:
            return render(request, 'admin/setting/account.html', {
                'account': {**_account_data(admin), 'email': email},
                'form_error': 'Email đăng nhập không được để trống.',
            }, status=400)

        if Admin.objects(email=email, id__ne=admin.id).first():
            return render(request, 'admin/setting/account.html', {
                'account': {**_account_data(admin), 'email': email},
                'form_error': 'Email này đã được một tài khoản Admin khác sử dụng.',
            }, status=409)

        admin.email = email
        try:
            admin.save()
        except (NotUniqueError, ValidationError):
            return render(request, 'admin/setting/account.html', {
                'account': {**_account_data(admin), 'email': email},
                'form_error': 'Email không hợp lệ hoặc đã được sử dụng.',
            }, status=400)

        messages.success(request, 'Email đăng nhập đã được cập nhật.')
        return redirect('account-settings')

    return render(request, 'admin/setting/account.html', {
        'account': _account_data(admin),
    })


def _account_data(admin):
    return {
        'id': admin.id,
        'email': admin.email,
        'role': _admin_role_label(admin.role),
        'status': 'Active' if admin.status == Admin.STATUS_ACTIVE else 'Inactive',
        'managed_by': admin.managed_by.name if admin.managed_by else 'Không có (tài khoản gốc)',
        'last_login': admin.last_login,
        'created_at': admin.created_at,
        'updated_at': admin.updated_at,
    }


def appearance_settings(request):
    return render(request, 'admin/setting/appearance.html')


def security_settings(request):
    admin = request.admin_account

    if request.method == 'POST':
        current_password = request.POST.get('current_password', '')
        new_password = request.POST.get('new_password', '')
        confirm_password = request.POST.get('confirm_password', '')

        if not admin.check_password(current_password):
            form_error = 'Mật khẩu hiện tại không chính xác.'
        elif new_password != confirm_password:
            form_error = 'Mật khẩu xác nhận không khớp.'
        elif len(new_password) < 8:
            form_error = 'Mật khẩu mới phải có ít nhất 8 ký tự.'
        elif len(new_password.encode('utf-8')) > 72:
            form_error = 'Mật khẩu mới không được vượt quá 72 byte.'
        elif admin.check_password(new_password):
            form_error = 'Mật khẩu mới không được trùng mật khẩu hiện tại.'
        else:
            admin.set_password(new_password)
            admin.session_version += 1
            admin.save()
            request.session.cycle_key()
            request.session['admin_session_version'] = admin.session_version
            messages.success(request, 'Mật khẩu đã được cập nhật.')
            return redirect('security-settings')

        return render(request, 'admin/setting/security.html', {
            'form_error': form_error,
        }, status=400)

    return render(request, 'admin/setting/security.html')


def display_settings(request):
    return render(request, 'admin/setting/display.html')


def sign_in(request):
    if request.session.get('admin_id') is not None:
        admin = Admin.objects(
            id=request.session['admin_id'],
            status=Admin.STATUS_ACTIVE,
        ).first()
        if (
            admin is not None
            and request.session.get('admin_session_version') == admin.session_version
        ):
            return redirect('dashboard-slash')
        request.session.pop('admin_id', None)
        request.session.pop('admin_session_version', None)

    if request.method == 'POST':
        email = request.POST.get('email', '').strip().lower()
        password = request.POST.get('password', '')
        admin = Admin.objects(email=email).first()

        if admin is None or not admin.check_password(password):
            return render(request, 'auth/sign-in.html', {
                'auth_error': 'Email hoặc mật khẩu không chính xác.',
                'entered_email': email,
            }, status=401)

        if admin.status != Admin.STATUS_ACTIVE:
            return render(request, 'auth/sign-in.html', {
                'auth_error': 'Tài khoản quản trị này đã ngừng hoạt động.',
                'entered_email': email,
            }, status=403)

        request.session.cycle_key()
        request.session['admin_id'] = int(admin.id)
        request.session['admin_session_version'] = admin.session_version
        request.session['dashboard_welcome_email'] = admin.email
        admin.last_login = datetime.now(timezone.utc)
        Admin.objects(id=admin.id).update_one(set__last_login=admin.last_login)

        next_url = request.POST.get('next', '')
        if next_url.startswith('/admin/'):
            return redirect(next_url)
        return redirect('dashboard-slash')

    return render(request, 'auth/sign-in.html', {
        'next': request.GET.get('next', ''),
        'auth_success': request.session.pop('password_reset_success', ''),
    })


def sign_out(request):
    if request.method == 'POST':
        request.session.flush()
    return redirect('login')


def forgot_password(request):
    if request.method == 'POST':
        email = request.POST.get('email', '').strip().lower()
        admin = Admin.objects(email=email, status=Admin.STATUS_ACTIVE).first()
        if admin is None:
            return render(request, 'auth/forgot-password.html', {
                'auth_error': 'Không tìm thấy tài khoản Admin đang hoạt động với email này.',
                'entered_email': email,
            }, status=404)

        now = datetime.now(timezone.utc)
        latest = PasswordResetOTP.objects(
            admin=admin,
            used_at=None,
        ).order_by('-created_at').first()
        if latest is not None:
            created_at = latest.created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            if now - created_at < timedelta(seconds=60):
                return render(request, 'auth/forgot-password.html', {
                    'auth_error': 'Vui lòng chờ 60 giây trước khi yêu cầu mã OTP mới.',
                    'entered_email': email,
                }, status=429)

        PasswordResetOTP.objects(admin=admin, used_at=None).update(
            set__used_at=now,
        )
        raw_code = f'{secrets.randbelow(1_000_000):06d}'
        otp_record = PasswordResetOTP(
            admin=admin,
            expires_at=now + timedelta(minutes=5),
        )
        otp_record.set_code(raw_code)
        otp_record.save()

        try:
            send_mail(
                subject='Mã OTP đặt lại mật khẩu EduTutor Admin',
                message=(
                    f'Xin chào {admin.name},\n\n'
                    f'Mã OTP của bạn là: {raw_code}\n'
                    'Mã này chỉ có hiệu lực trong 5 phút.\n\n'
                    'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[admin.email],
                fail_silently=False,
            )
        except Exception:
            logger.exception('Could not send admin password reset OTP email.')
            otp_record.delete()
            return render(request, 'auth/forgot-password.html', {
                'auth_error': 'Không thể gửi email. Vui lòng kiểm tra cấu hình SMTP rồi thử lại.',
                'entered_email': email,
            }, status=503)

        request.session['password_reset_otp_id'] = str(otp_record.id)
        request.session['password_reset_admin_id'] = int(admin.id)
        return redirect('otp')

    return render(request, 'auth/forgot-password.html')


def otp(request):
    otp_id = request.session.get('password_reset_otp_id')
    admin_id = request.session.get('password_reset_admin_id')
    otp_record = PasswordResetOTP.objects(id=otp_id, admin=admin_id).first() if otp_id and admin_id else None
    if otp_record is None or otp_record.used_at is not None:
        return redirect('forgot-password')

    expires_at = otp_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    context = {
        'reset_email': otp_record.admin.email,
        'auth_success': f'Mã OTP đã được gửi tới {otp_record.admin.email}. Mã có hiệu lực 5 phút.',
        'otp_expires_at': int(expires_at.timestamp()),
    }

    if request.method == 'POST':
        context.pop('auth_success', None)
        raw_code = request.POST.get('otp', '').strip()
        if otp_record.is_expired():
            context['auth_error'] = 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.'
            return render(request, 'auth/otp.html', context, status=410)
        if otp_record.attempts >= 5:
            context['auth_error'] = 'Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu mã OTP mới.'
            return render(request, 'auth/otp.html', context, status=429)
        if len(raw_code) != 6 or not raw_code.isdigit() or not otp_record.check_code(raw_code):
            otp_record.attempts += 1
            otp_record.save()
            attempts_left = max(0, 5 - otp_record.attempts)
            context['auth_error'] = f'Mã OTP không chính xác. Bạn còn {attempts_left} lần thử.'
            return render(request, 'auth/otp.html', context, status=400)

        now = datetime.now(timezone.utc)
        otp_record.used_at = now
        otp_record.save()
        request.session.pop('password_reset_otp_id', None)
        request.session['password_reset_verified_admin_id'] = int(otp_record.admin.id)
        request.session['password_reset_verified_until'] = int(
            (now + timedelta(minutes=5)).timestamp()
        )
        return redirect('reset-password')

    return render(request, 'auth/otp.html', context)


def reset_password(request):
    admin_id = request.session.get('password_reset_verified_admin_id')
    verified_until = request.session.get('password_reset_verified_until', 0)
    if not admin_id or datetime.now(timezone.utc).timestamp() > verified_until:
        request.session.pop('password_reset_verified_admin_id', None)
        request.session.pop('password_reset_verified_until', None)
        return redirect('forgot-password')

    admin = Admin.objects(id=admin_id, status=Admin.STATUS_ACTIVE).first()
    if admin is None:
        return redirect('forgot-password')

    if request.method == 'POST':
        new_password = request.POST.get('new_password', '')
        confirm_password = request.POST.get('confirm_password', '')
        if new_password != confirm_password:
            form_error = 'Mật khẩu xác nhận không khớp.'
        elif len(new_password) < 8:
            form_error = 'Mật khẩu mới phải có ít nhất 8 ký tự.'
        elif len(new_password.encode('utf-8')) > 72:
            form_error = 'Mật khẩu mới không được vượt quá 72 byte.'
        elif admin.check_password(new_password):
            form_error = 'Mật khẩu mới không được trùng mật khẩu hiện tại.'
        else:
            admin.set_password(new_password)
            admin.session_version += 1
            admin.save()
            request.session.flush()
            request.session['password_reset_success'] = 'Mật khẩu đã được cập nhật.'
            return redirect('login')

        return render(request, 'auth/reset-password.html', {
            'auth_error': form_error,
        }, status=400)

    return render(request, 'auth/reset-password.html')


def page_not_found(request, exception=None, **kwargs):
    return render(request, 'error/not-found.html', status=404)
