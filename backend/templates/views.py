import json
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone

from django.conf import settings
from django.contrib import messages
from django.core.mail import EmailMessage, get_connection, send_mail
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils.text import slugify
from mongoengine import NotUniqueError, ValidationError

from accounts.documents import Admin, AuthToken, Student, User
from accounts.cloudinary_media import (
    delete_asset, upload_admin_avatar, upload_banner_image, upload_blog_thumbnail,
    upload_tutor_avatar,
)
from accounts.session import admin_session_is_valid, clear_admin_session
from core.documents import Banner, BlogCategory, BlogPost, Payment
from core.admin_audit import activity_logs, record_admin_activity
from lessons.documents import LearningRequest, Lesson
from tutors.documents import (
    JobApplication, JobPosting, Province, Subject, Tutor, TutorApplication, TutorSubject,
    TutorTeachingArea, Ward,
)


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


def _recruitment_reference_name(reference):
    """Return a catalogue label without failing on a dangling old reference."""
    try:
        return reference.name if reference else '-'
    except Exception:
        return '-'


def _recruitment_reference_id(reference):
    """Return a reference id while tolerating legacy dangling references."""
    try:
        return str(reference.id) if reference else ''
    except Exception:
        return ''


def _recruitment_date(value):
    return value.astimezone(timezone.utc).strftime('%d/%m/%Y') if value else '-'


def _recruitment_area(job):
    province = _recruitment_reference_name(job.province)
    ward = _recruitment_reference_name(job.ward)
    if ward != '-':
        return f'{ward}, {province}'
    # Existing records can still contain a legacy district reference.
    district = _recruitment_reference_name(job.district)
    return province if district == '-' else f'{district}, {province}'


def _format_currency(amount):
    return f'{amount:,.0f}'.replace(',', '.') + ' VNĐ'


def _recruitment_budget(job):
    if job.budget_min is None and job.budget_max is None:
        return 'Thỏa thuận'
    if job.budget_min is None:
        return f'Đến {_format_currency(job.budget_max)}/giờ'
    if job.budget_max is None:
        return f'Từ {_format_currency(job.budget_min)}/giờ'
    return f'{_format_currency(job.budget_min)} - {_format_currency(job.budget_max)}/giờ'


def _recruitment_status(value):
    return str(value or 'pending').replace('_', ' ').title()


def _tutor_mode(value):
    return {
        'online': 'Trực tuyến',
        'offline': 'Trực tiếp',
        'both': 'Trực tuyến & trực tiếp',
    }.get(value, '-')


def _tutors_page_config():
    tutors = list(Tutor.objects.order_by('-created_at'))
    rows = []
    for tutor in tutors:
        subjects = ', '.join(
            link.subject.name for link in TutorSubject.objects(tutor=tutor).select_related()
        ) or 'Chưa cập nhật'
        # MongoEngine evaluates ``select_related()`` into a Python list, unlike
        # a normal QuerySet, so it does not provide ``.first()``.
        area_link = next(iter(TutorTeachingArea.objects(tutor=tutor).select_related()), None)
        area = area_link.province.name if area_link else 'Chưa cập nhật'
        if area_link and area_link.ward:
            area = f'{area} — {area_link.ward.name}'
        rows.append((
            tutor.name, tutor.email, subjects, area, _tutor_mode(tutor.teaching_mode),
            _recruitment_status(tutor.status),
        ))
    return {
        'title': 'Quản lý gia sư',
        'group': 'Quản lý',
        'singular': 'gia sư',
        'description': 'Tạo, cập nhật và xóa hồ sơ gia sư cùng thông tin chuyên môn từ CV.',
        'columns': [
            ('name', 'Họ và tên'), ('email', 'Email'), ('subjects', 'Môn dạy'),
            ('area', 'Khu vực'), ('teaching_mode', 'Hình thức dạy'), ('status', 'Trạng thái'),
        ],
        'statuses': ['Pending', 'Approved', 'Rejected'],
        'rows': rows,
        'records': tutors,
    }


def _recruitment_page_config(module):
    """Build recruitment tables from the defined MongoDB collections.

    Interview appointments, trial-lesson scores, contracts and onboarding
    progress do not exist in the approved schema, so no placeholder data is
    created for them.
    """
    if module == 'tutor-jobs':
        jobs = list(JobPosting.objects.order_by('-created_at'))
        return {
            'title': 'Tin tuyển dụng gia sư',
            'group': 'Tuyển dụng',
            'singular': 'tin tuyển dụng',
            'description': 'Đăng và quản lý các nhu cầu tìm gia sư theo môn học, khu vực và lịch học.',
            'columns': [
                ('title', 'Tiêu đề'), ('subject', 'Môn học'), ('area', 'Khu vực'),
                ('budget', 'Ngân sách'), ('schedule', 'Lịch mong muốn'), ('status', 'Trạng thái'),
            ],
            'statuses': ['Open', 'Closed'],
            'rows': [(
                job.title, _recruitment_reference_name(job.subject), _recruitment_area(job),
                _recruitment_budget(job), job.schedule_expect or '-', _recruitment_status(job.status),
            ) for job in jobs],
            'records': jobs,
        }

    applications = list(TutorApplication.objects.order_by('-created_at'))
    if module == 'tutor-candidates':
        return {
            'title': 'Ứng viên gia sư', 'group': 'Tuyển dụng', 'singular': 'ứng viên',
            'description': 'Theo dõi hồ sơ ứng tuyển và tiến độ tuyển dụng của các ứng viên gia sư.',
            'columns': [
                ('candidate', 'Ứng viên'), ('email', 'Email'), ('phone', 'Số điện thoại'),
                ('applied', 'Ngày ứng tuyển'), ('status', 'Trạng thái'),
            ],
            'statuses': ['Pending', 'Reviewing', 'Approved', 'Rejected'],
            'rows': [(
                item.name, item.email, item.phone, _recruitment_date(item.created_at),
                _recruitment_status(item.status),
            ) for item in applications],
        }

    if module == 'tutor-approvals':
        return {
            'title': 'Duyệt hồ sơ gia sư', 'group': 'Tuyển dụng', 'singular': 'hồ sơ gia sư',
            'description': 'Kiểm tra hồ sơ, giấy tờ và đưa ra quyết định phê duyệt ứng viên.',
            'columns': [
                ('applicant', 'Ứng viên'), ('documents', 'Tài liệu'), ('submitted', 'Ngày gửi'),
                ('reviewed', 'Duyệt lúc'), ('status', 'Trạng thái'),
            ],
            'statuses': ['Pending', 'Reviewing', 'Approved', 'Rejected'],
            'rows': [(
                item.name,
                ' / '.join(label for label, url in (
                    ('CV', item.cv_file), ('CCCD', item.id_card_file), ('Bằng cấp', item.education_proof_file),
                ) if url) or 'Chưa đính kèm',
                _recruitment_date(item.created_at), _recruitment_date(item.reviewed_at),
                _recruitment_status(item.status),
            ) for item in applications],
        }

    if module == 'tutor-interviews':
        reviewing = [item for item in applications if item.status == 'reviewing']
        return {
            'title': 'Phỏng vấn & Dạy thử', 'group': 'Tuyển dụng', 'singular': 'hồ sơ phỏng vấn',
            'description': 'Theo dõi các ứng viên đang được sắp xếp phỏng vấn hoặc dạy thử.',
            'columns': [
                ('candidate', 'Ứng viên'), ('email', 'Email'), ('phone', 'Số điện thoại'),
                ('reviewed', 'Bắt đầu xét duyệt'), ('reviewer', 'Người phụ trách'), ('status', 'Trạng thái'),
            ],
            'statuses': ['Reviewing'],
            'rows': [(
                item.name, item.email, item.phone, _recruitment_date(item.reviewed_at),
                _recruitment_reference_name(item.reviewed_by), _recruitment_status(item.status),
            ) for item in reviewing],
        }

    if module == 'tutor-onboarding':
        tutors = list(Tutor.objects(status=Tutor.STATUS_ACTIVE).order_by('-created_at'))
        return {
            'title': 'Tiếp nhận gia sư', 'group': 'Tuyển dụng', 'singular': 'gia sư tiếp nhận',
            'description': 'Hoàn tất thông tin tài khoản và xác minh gia sư sau khi được phê duyệt.',
            'columns': [
                ('tutor', 'Gia sư'), ('email', 'Email'), ('phone', 'Số điện thoại'),
                ('mode', 'Hình thức dạy'), ('verified', 'Xác minh'), ('status', 'Trạng thái'),
            ],
            'statuses': ['Approved'],
            'rows': [(
                tutor.name, tutor.email, tutor.phone or '-', _tutor_mode(tutor.teaching_mode),
                'Đã xác minh' if tutor.is_verified else 'Chưa xác minh', _recruitment_status(tutor.status),
            ) for tutor in tutors],
        }

    return None


def _location_page_config(tab='provinces'):
    """Build read-only views of the 2026 administrative location catalogue."""
    if tab == 'wards':
        wards = Ward.objects.order_by('province', 'name').select_related()
        type_labels = {
            Ward.TYPE_WARD: 'Phường',
            Ward.TYPE_COMMUNE: 'Xã',
            Ward.TYPE_SPECIAL_ZONE: 'Đặc khu',
        }
        return {
            'tab': 'wards',
            'title': 'Xã, Phường & Đặc khu',
            'group': 'Địa giới hành chính',
            'singular': 'đơn vị cấp xã',
            'description': 'Danh mục hành chính Việt Nam 2026. Dữ liệu chỉ đọc để bảo đảm địa chỉ tuyển dụng chính xác.',
            'columns': [('name', 'Tên đơn vị'), ('type', 'Loại'), ('province', 'Tỉnh/Thành phố'), ('code', 'Mã hành chính')],
            'statuses': [],
            'rows': [(ward.name, type_labels[ward.type], ward.province.name, ward.code) for ward in wards],
        }

    provinces = list(Province.objects.order_by('name'))
    return {
        'tab': 'provinces',
        'title': 'Tỉnh & Thành phố',
        'group': 'Địa giới hành chính',
        'singular': 'tỉnh/thành phố',
        'description': '34 tỉnh và thành phố trực thuộc trung ương theo danh mục hành chính Việt Nam 2026.',
        'columns': [('name', 'Tỉnh/Thành phố'), ('code', 'Mã hành chính'), ('wards', 'Số đơn vị cấp xã')],
        'statuses': [],
        'rows': [(province.name, province.code, str(Ward.objects(province=province).count())) for province in provinces],
    }


def _slides_page_config():
    banners = list(Banner.objects.order_by('sort_order', '-created_at'))
    return {
        'title': 'Quản lý Banner',
        'group': 'Nội dung',
        'singular': 'banner',
        'description': 'Tạo, sắp xếp và bật/tắt banner trình chiếu trên trang chủ.',
        'columns': [('image', 'Ảnh banner'), ('title', 'Tiêu đề'), ('position', 'Thứ tự'), ('link', 'Liên kết'), ('status', 'Trạng thái')],
        'statuses': ['Active', 'Inactive'],
        'records': banners,
        'rows': [
            (banner.image, banner.title or 'Không có tiêu đề', str(banner.sort_order), banner.link_url or '-', banner.status.title())
            for banner in banners
        ],
    }


def _banner_values(request, banner=None):
    status = request.POST.get('status', 'active').strip().lower()
    if status not in ('active', 'inactive'):
        raise ValueError('Trạng thái banner không hợp lệ.')
    sort_order = _optional_nonnegative_int(request.POST.get('sort_order', ''), 'Thứ tự hiển thị')
    image_upload = request.FILES.get('image_file')
    if banner is None and not image_upload:
        raise ValueError('Vui lòng chọn ảnh banner.')

    title = request.POST.get('title', '').strip()
    values = {
        'title': title or None,
        'slug': slugify(title or 'banner')[:180] or 'banner',
        'link_url': request.POST.get('link_url', '').strip() or None,
        'sort_order': sort_order or 0,
        'status': status,
    }
    if image_upload:
        uploaded = upload_banner_image(image_upload, values['slug'])
        values['image'] = uploaded['secure_url']
        values['image_public_id'] = uploaded.get('public_id')
    return values


def banner_create(request):
    if request.method != 'POST':
        return redirect('management-page', module='slides')
    try:
        banner = Banner(**_banner_values(request)).save()
        record_admin_activity(request, 'create', banner)
    except (ValueError, ValidationError, NotUniqueError) as exc:
        messages.error(request, str(exc) or 'Không thể tạo banner.')
    else:
        messages.success(request, 'Tạo banner thành công.')
    return redirect('management-page', module='slides')


def banner_edit(request, banner_id):
    if request.method != 'POST':
        return redirect('management-page', module='slides')
    banner = Banner.objects(id=banner_id).first()
    if banner is None:
        messages.error(request, 'Không tìm thấy banner.')
        return redirect('management-page', module='slides')
    try:
        previous_public_id = banner.image_public_id
        for field, value in _banner_values(request, banner).items():
            setattr(banner, field, value)
        banner.updated_at = datetime.now(timezone.utc)
        banner.save()
        if banner.image_public_id and banner.image_public_id != previous_public_id:
            delete_asset(previous_public_id)
    except (ValueError, ValidationError, NotUniqueError) as exc:
        messages.error(request, str(exc) or 'Không thể cập nhật banner.')
    else:
        record_admin_activity(request, 'update', banner)
        messages.success(request, 'Cập nhật banner thành công.')
    return redirect('management-page', module='slides')


def banner_delete(request, banner_id):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    banner = Banner.objects(id=banner_id).first()
    if banner is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy banner.'}, status=404)
    delete_asset(banner.image_public_id)
    banner.delete()
    record_admin_activity(request, 'delete', banner)
    return JsonResponse({'ok': True, 'message': 'Xóa banner thành công.'})


def banner_toggle_status(request, banner_id):
    """Allow every authenticated administrator to enable or disable a banner."""
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    banner = Banner.objects(id=banner_id).first()
    if banner is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy banner.'}, status=404)
    banner.status = 'inactive' if banner.status == 'active' else 'active'
    banner.updated_at = datetime.now(timezone.utc)
    banner.save()
    record_admin_activity(request, 'toggle_status', banner)
    label = banner.status.title()
    return JsonResponse({
        'ok': True,
        'status': label,
        'status_code': banner.status,
        'message': f"Đã {'bật' if banner.status == 'active' else 'tắt'} banner thành công.",
    })


def _catalogue_slug(document_class, value, fallback):
    base = slugify(value)[:150] or fallback
    candidate = base
    number = 2
    while document_class.objects(slug=candidate).first() is not None:
        candidate = f'{base[:140]}-{number}'
        number += 1
    return candidate


def _blog_page_config(tab='posts'):
    if tab == 'categories':
        categories = list(BlogCategory.objects.order_by('name'))
        return {
            'tab': 'categories',
            'title': 'Danh mục Blog',
            'group': 'Nội dung',
            'singular': 'danh mục',
            'description': 'Tạo và quản lý các chuyên mục để phân loại bài viết.',
            'columns': [
                ('name', 'Tên danh mục'), ('slug', 'Đường dẫn'),
                ('posts', 'Số bài viết'), ('created', 'Ngày tạo'), ('status', 'Trạng thái'),
            ],
            'statuses': ['Active', 'Inactive'],
            'records': categories,
            'rows': [(
                category.name,
                category.slug,
                str(BlogPost.objects(category=category).count()),
                _recruitment_date(category.created_at),
                'Active' if category.status != 0 else 'Inactive',
            ) for category in categories],
        }

    posts = list(BlogPost.objects.order_by('-created_at'))
    return {
        'tab': 'posts',
        'title': 'Quản lý Blog',
        'group': 'Nội dung',
        'singular': 'bài viết',
        'description': 'Soạn thảo, lưu nháp và xuất bản các bài viết của EduTutor.',
        'columns': [
            ('title', 'Tiêu đề'), ('author', 'Tác giả'), ('category', 'Chuyên mục'),
            ('views', 'Lượt xem'), ('published', 'Ngày xuất bản'), ('status', 'Trạng thái'),
        ],
        'statuses': ['Draft', 'Published'],
        'records': posts,
        'rows': [(
            post.title,
            _recruitment_reference_name(post.admin),
            _recruitment_reference_name(post.category),
            str(post.views or 0),
            _recruitment_date(post.published_at),
            _recruitment_status(post.status),
        ) for post in posts],
    }


def _required_blog_category(request):
    category_id = request.POST.get('category_id', '').strip()
    category = BlogCategory.objects(id=category_id).first() if category_id else None
    if category is None:
        raise ValueError('Vui lòng chọn một danh mục Blog.')
    return category


def _blog_category_is_active(category):
    """Legacy categories without a stored value remain active by default."""
    return category is not None and category.status != 0


def blog_post_create(request):
    """Create a blog post in the blog_posts collection."""
    if request.method != 'POST':
        return redirect('management-page', module='blog')

    try:
        title = request.POST.get('title', '').strip()
        content = request.POST.get('content', '').strip()
        if not title or not content:
            raise ValueError('Tiêu đề và nội dung không được để trống.')
        status = request.POST.get('status', 'draft').strip().lower()
        if status not in ('draft', 'published'):
            raise ValueError('Trạng thái bài viết không hợp lệ.')

        category = _required_blog_category(request)
        if status == 'published' and not _blog_category_is_active(category):
            raise ValueError('Không thể xuất bản bài viết vì danh mục đang Inactive. Hãy bật danh mục trước.')
        slug = _catalogue_slug(BlogPost, title, 'blog-post')
        thumbnail = None
        thumbnail_upload = request.FILES.get('thumbnail_image')
        if thumbnail_upload:
            thumbnail = upload_blog_thumbnail(thumbnail_upload, slug)['secure_url']

        post = BlogPost(
            slug=slug,
            category=category,
            admin=request.admin_account,
            title=title,
            excerpt=request.POST.get('excerpt', '').strip() or None,
            content=content,
            thumbnail=thumbnail,
            status=status,
            published_at=datetime.now(timezone.utc) if status == 'published' else None,
        ).save()
    except (ValueError, ValidationError, NotUniqueError) as exc:
        messages.error(request, str(exc) or 'Không thể tạo bài viết.')
        return redirect('management-page', module='blog')

    record_admin_activity(request, 'create', post)
    messages.success(request, 'Tạo bài viết thành công.')
    return redirect('management-page', module='blog')


def blog_category_create(request):
    """Create a category in the blog_categories collection."""
    if request.method != 'POST':
        return redirect(f"{reverse('management-page', kwargs={'module': 'blog'})}?tab=categories")

    category_name = request.POST.get('name', '').strip()
    status = request.POST.get('status', '1').strip()
    if not category_name:
        messages.error(request, 'Tên danh mục không được để trống.')
    elif status not in ('0', '1'):
        messages.error(request, 'Trạng thái danh mục chỉ có thể là Active hoặc Inactive.')
    elif BlogCategory.objects(name__iexact=category_name).first() is not None:
        messages.error(request, 'Danh mục này đã tồn tại.')
    else:
        category = BlogCategory(
            slug=_catalogue_slug(BlogCategory, category_name, 'blog-category'),
            name=category_name,
            status=int(status),
        ).save()
        record_admin_activity(request, 'create', category)
        messages.success(request, 'Tạo danh mục Blog thành công.')
    return redirect(f"{reverse('management-page', kwargs={'module': 'blog'})}?tab=categories")


def _blog_category_redirect():
    return redirect(f"{reverse('management-page', kwargs={'module': 'blog'})}?tab=categories")


def blog_post_edit(request, slug):
    if request.method != 'POST':
        return redirect('management-page', module='blog')
    post = BlogPost.objects(slug=slug).first()
    if post is None:
        messages.error(request, 'Không tìm thấy bài viết.')
        return redirect('management-page', module='blog')
    try:
        title = request.POST.get('title', '').strip()
        content = request.POST.get('content', '').strip()
        status = request.POST.get('status', post.status).strip().lower()
        if not title or not content:
            raise ValueError('Tiêu đề và nội dung không được để trống.')
        if status not in ('draft', 'published'):
            raise ValueError('Trạng thái bài viết không hợp lệ.')
        category = _required_blog_category(request)
        if status == 'published' and not _blog_category_is_active(category):
            raise ValueError('Không thể xuất bản bài viết vì danh mục đang Inactive. Hãy bật danh mục trước.')
        post.category = category
        post.title = title
        post.content = content
        post.excerpt = request.POST.get('excerpt', '').strip() or None
        thumbnail_upload = request.FILES.get('thumbnail_image')
        if thumbnail_upload:
            post.thumbnail = upload_blog_thumbnail(thumbnail_upload, post.slug)['secure_url']
        post.status = status
        if status == 'published' and post.published_at is None:
            post.published_at = datetime.now(timezone.utc)
        elif status == 'draft':
            post.published_at = None
        post.updated_at = datetime.now(timezone.utc)
        post.save()
    except (ValueError, ValidationError, NotUniqueError) as exc:
        messages.error(request, str(exc) or 'Không thể cập nhật bài viết.')
        return redirect('management-page', module='blog')
    record_admin_activity(request, 'update', post)
    messages.success(request, 'Cập nhật bài viết thành công.')
    return redirect('management-page', module='blog')


def blog_post_delete(request, slug):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    post = BlogPost.objects(slug=slug).first()
    if post is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy bài viết.'}, status=404)
    post.delete()
    record_admin_activity(request, 'delete', post)
    messages.success(request, 'Đã xóa bài viết.')
    return JsonResponse({'ok': True, 'message': 'Xóa bài viết thành công.'})


def blog_post_toggle_status(request, slug):
    """Toggle a post between draft and published directly from the listing."""
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)

    post = BlogPost.objects(slug=slug).first()
    if post is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy bài viết.'}, status=404)

    publishing = post.status != 'published'
    if publishing and not _blog_category_is_active(post.category):
        return JsonResponse({
            'ok': False,
            'message': 'Không thể xuất bản bài viết vì danh mục đang Inactive. Hãy bật danh mục trước.',
        }, status=400)
    post.status = 'published' if publishing else 'draft'
    # A publication date represents this publication event. Returning a post to
    # draft clears it; publishing it again records the new date/time.
    post.published_at = datetime.now(timezone.utc) if publishing else None
    post.updated_at = datetime.now(timezone.utc)
    try:
        post.save()
    except (ValidationError, ValueError):
        return JsonResponse({'ok': False, 'message': 'Không thể cập nhật trạng thái bài viết.'}, status=400)

    record_admin_activity(request, 'publish' if publishing else 'unpublish', post)
    return JsonResponse({
        'ok': True,
        'message': 'Đã xuất bản bài viết.' if publishing else 'Đã chuyển bài viết về bản nháp.',
        'status': 'Published' if publishing else 'Draft',
        'status_code': post.status,
        'published_at': _recruitment_date(post.published_at),
    })


def blog_category_edit(request, slug):
    if request.method != 'POST':
        return _blog_category_redirect()
    category = BlogCategory.objects(slug=slug).first()
    if category is None:
        messages.error(request, 'Không tìm thấy danh mục.')
        return _blog_category_redirect()
    name = request.POST.get('name', '').strip()
    status = request.POST.get('status', str(0 if category.status == 0 else 1)).strip()
    if not name:
        messages.error(request, 'Tên danh mục không được để trống.')
    elif status not in ('0', '1'):
        messages.error(request, 'Trạng thái danh mục chỉ có thể là Active hoặc Inactive.')
    elif BlogCategory.objects(name__iexact=name, id__ne=category.id).first() is not None:
        messages.error(request, 'Danh mục này đã tồn tại.')
    else:
        category.name = name
        category.status = int(status)
        category.updated_at = datetime.now(timezone.utc)
        category.save()
        record_admin_activity(request, 'update', category)
        messages.success(request, 'Cập nhật danh mục Blog thành công.')
    return _blog_category_redirect()


def blog_category_delete(request, slug):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    category = BlogCategory.objects(slug=slug).first()
    if category is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy danh mục.'}, status=404)
    BlogPost.objects(category=category).update(set__category=None)
    category.delete()
    record_admin_activity(request, 'delete', category)
    messages.success(request, 'Đã xóa danh mục Blog.')
    return JsonResponse({'ok': True, 'message': 'Xóa danh mục Blog thành công.'})


def blog_category_toggle_status(request, slug):
    """Toggle a category between numeric active (1) and inactive (0)."""
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)

    category = BlogCategory.objects(slug=slug).first()
    if category is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy danh mục Blog.'}, status=404)

    category.status = 0 if category.status != 0 else 1
    category.updated_at = datetime.now(timezone.utc)
    try:
        category.save()
    except (ValidationError, ValueError):
        return JsonResponse({'ok': False, 'message': 'Không thể cập nhật trạng thái danh mục.'}, status=400)

    active = category.status == 1
    record_admin_activity(request, 'activate' if active else 'deactivate', category)
    return JsonResponse({
        'ok': True,
        'message': f"Đã {'bật' if active else 'tắt'} danh mục {category.name}.",
        'status': 'Active' if active else 'Inactive',
        'status_code': category.status,
    })


def _job_catalogue_values(request):
    """Resolve a job location against the official 2026 location catalogue."""
    subject_name = request.POST.get('subject_name', '').strip()
    province_id = request.POST.get('province_id', '').strip()
    ward_id = request.POST.get('ward_id', '').strip()
    if not subject_name or not province_id or not ward_id:
        raise ValueError('Vui lòng chọn môn học, tỉnh/thành phố và xã/phường/đặc khu.')

    subject = Subject.objects(name__iexact=subject_name).first()
    if subject is None:
        subject = Subject(slug=_catalogue_slug(Subject, subject_name, 'subject'), name=subject_name)
        subject.save()

    province = Province.objects(id=province_id).first()
    if province is None:
        raise ValueError('Tỉnh/thành phố không tồn tại trong danh mục hành chính 2026.')
    ward = Ward.objects(id=ward_id, province=province).first()
    if ward is None:
        raise ValueError('Xã/phường/đặc khu không thuộc tỉnh/thành phố đã chọn.')
    return subject, province, ward


def _optional_nonnegative_int(raw, label):
    raw = raw.strip()
    if not raw:
        return None
    try:
        value = int(raw)
    except ValueError as exc:
        raise ValueError(f'{label} phải là số nguyên.') from exc
    if value < 0:
        raise ValueError(f'{label} không được âm.')
    return value


def tutor_job_create(request):
    """Create a job posting and its missing catalogue references in MongoDB."""
    if request.method != 'POST':
        return redirect('management-page', module='tutor-jobs')

    try:
        title = request.POST.get('title', '').strip()
        description = request.POST.get('description', '').strip()
        if not title or not description:
            raise ValueError('Tiêu đề và mô tả không được để trống.')
        status = request.POST.get('status', 'open').strip().lower()
        if status not in ('open', 'closed'):
            raise ValueError('Trạng thái tin tuyển dụng không hợp lệ.')
        budget_min = _optional_nonnegative_int(request.POST.get('budget_min', ''), 'Ngân sách tối thiểu')
        budget_max = _optional_nonnegative_int(request.POST.get('budget_max', ''), 'Ngân sách tối đa')
        if budget_min is not None and budget_max is not None and budget_min > budget_max:
            raise ValueError('Ngân sách tối thiểu không được lớn hơn ngân sách tối đa.')
        subject, province, ward = _job_catalogue_values(request)
        job = JobPosting(
            slug=_catalogue_slug(JobPosting, title, 'job'),
            posted_by_type='admin',
            posted_by_id=int(request.admin_account.id),
            title=title,
            subject=subject,
            province=province,
            ward=ward,
            grade=request.POST.get('grade', '').strip() or None,
            description=description,
            budget_min=budget_min,
            budget_max=budget_max,
            schedule_expect=request.POST.get('schedule_expect', '').strip() or None,
            status=status,
        )
        job.save()
    except (ValueError, ValidationError, NotUniqueError) as exc:
        messages.error(request, str(exc) or 'Không thể tạo tin tuyển dụng.')
        return redirect('management-page', module='tutor-jobs')

    record_admin_activity(request, 'create', job)
    messages.success(request, 'Tạo tin tuyển dụng thành công.')
    return redirect('management-page', module='tutor-jobs')


def tutor_job_edit(request, slug):
    """Update an existing job posting, addressed by its stable public slug."""
    if request.method != 'POST':
        return redirect('management-page', module='tutor-jobs')

    job = JobPosting.objects(slug=slug).first()
    if job is None:
        messages.error(request, 'Không tìm thấy tin tuyển dụng.')
        return redirect('management-page', module='tutor-jobs')

    try:
        title = request.POST.get('title', '').strip()
        description = request.POST.get('description', '').strip()
        if not title or not description:
            raise ValueError('Tiêu đề và mô tả không được để trống.')
        status = request.POST.get('status', job.status).strip().lower()
        if status not in ('open', 'closed'):
            raise ValueError('Trạng thái tin tuyển dụng không hợp lệ.')
        budget_min = _optional_nonnegative_int(request.POST.get('budget_min', ''), 'Ngân sách tối thiểu')
        budget_max = _optional_nonnegative_int(request.POST.get('budget_max', ''), 'Ngân sách tối đa')
        if budget_min is not None and budget_max is not None and budget_min > budget_max:
            raise ValueError('Ngân sách tối thiểu không được lớn hơn ngân sách tối đa.')
        subject, province, ward = _job_catalogue_values(request)

        job.title = title
        job.description = description
        job.subject = subject
        job.province = province
        job.ward = ward
        job.grade = request.POST.get('grade', '').strip() or None
        job.budget_min = budget_min
        job.budget_max = budget_max
        job.schedule_expect = request.POST.get('schedule_expect', '').strip() or None
        job.status = status
        job.updated_at = datetime.now(timezone.utc)
        job.save()
    except (ValueError, ValidationError, NotUniqueError) as exc:
        messages.error(request, str(exc) or 'Không thể cập nhật tin tuyển dụng.')
        return redirect('management-page', module='tutor-jobs')

    record_admin_activity(request, 'update', job)
    messages.success(request, 'Cập nhật tin tuyển dụng thành công.')
    return redirect('management-page', module='tutor-jobs')


def tutor_job_delete(request, slug):
    """Delete a job and dependent applications to avoid dangling records."""
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)

    job = JobPosting.objects(slug=slug).first()
    if job is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy tin tuyển dụng.'}, status=404)

    JobApplication.objects(job_posting=job).delete()
    job.delete()
    record_admin_activity(request, 'delete', job)
    return JsonResponse({'ok': True, 'message': 'Xóa tin tuyển dụng thành công.'})


def tutor_job_toggle_status(request, slug):
    """Switch a job posting between Open and Closed from the listing."""
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)

    job = JobPosting.objects(slug=slug).first()
    if job is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy tin tuyển dụng.'}, status=404)

    job.status = 'closed' if job.status == 'open' else 'open'
    job.updated_at = datetime.now(timezone.utc)
    try:
        job.save()
    except (ValidationError, ValueError):
        return JsonResponse({'ok': False, 'message': 'Không thể cập nhật trạng thái tin tuyển dụng.'}, status=400)

    is_open = job.status == 'open'
    record_admin_activity(request, 'open' if is_open else 'close', job)
    return JsonResponse({
        'ok': True,
        'status': 'Open' if is_open else 'Closed',
        'status_code': job.status,
        'message': 'Đã mở tin tuyển dụng.' if is_open else 'Đã đóng tin tuyển dụng.',
    })


CV_MAX_SIZE = 5 * 1024 * 1024


def _cv_text(upload):
    """Extract selectable text from a PDF or DOCX CV without persisting it."""
    filename = (upload.name or '').lower()
    if upload.size > CV_MAX_SIZE:
        raise ValueError('CV không được vượt quá 5 MB.')

    try:
        upload.seek(0)
        if filename.endswith('.pdf'):
            from pypdf import PdfReader

            reader = PdfReader(upload)
            return '\n'.join(page.extract_text() or '' for page in reader.pages)

        if filename.endswith('.docx'):
            from docx import Document

            document = Document(upload)
            parts = [paragraph.text for paragraph in document.paragraphs]
            for table in document.tables:
                for row in table.rows:
                    parts.extend(cell.text for cell in row.cells)
            for section in document.sections:
                parts.extend(paragraph.text for paragraph in section.header.paragraphs)
                parts.extend(paragraph.text for paragraph in section.footer.paragraphs)
            return '\n'.join(part for part in parts if part and part.strip())
    except Exception as exc:
        logger.info('Could not extract text from uploaded CV %s: %s', upload.name, exc)
        raise ValueError('Tệp CV bị lỗi, được bảo vệ bằng mật khẩu hoặc không thể đọc.') from exc

    raise ValueError('CV phải là tệp PDF hoặc DOCX.')


def _cv_match(pattern, text, flags=re.IGNORECASE):
    match = re.search(pattern, text, flags)
    return match.group(1).strip(' :-\t') if match else ''


def _tutor_cv_values(text):
    """Return conservative, reviewable suggestions from common Vietnamese CV labels."""
    text = re.sub(r'\r\n?', '\n', text)
    compact = re.sub(r'[ \t]+', ' ', text)
    email = _cv_match(r'\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b', compact)
    phone = _cv_match(r'(?<!\d)((?:\+84|0)(?:[ .-]?\d){8,10})(?!\d)', compact)
    phone = re.sub(r'[^+\d]', '', phone)
    name = _cv_match(r'(?:họ\s*(?:và|&)\s*tên|họ tên|full\s*name|name)\s*[:：-]\s*([^\n]{2,150})', text)
    if not name:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        name = next((line for line in lines[:8] if re.fullmatch(r'[A-Za-zÀ-ỹĐđ .]{4,80}', line)), '')
    education = _cv_match(r'(?:học vấn|trình độ học vấn|education)\s*[:：-]?\s*([^\n]{3,150})', text)
    experience = _cv_match(r'(?:kinh nghiệm|experience)\s*[:：-]?\s*(\d{1,2})\s*(?:năm|years?)', text)
    if not experience:
        experience = _cv_match(r'(\d{1,2})\s*(?:năm|years?)\s*(?:kinh nghiệm|experience)', compact)
    rates = [int(value.replace('.', '').replace(',', '').replace(' ', '')) for value in re.findall(r'(?<!\d)(\d{2,3}(?:[., ]\d{3})+|\d{5,6})\s*(?:đ|vnd|vnđ)\b', compact, re.IGNORECASE)]
    result = {'name': name, 'email': email.lower(), 'phone': phone, 'education_level': education, 'experience_years': experience}
    if rates:
        result['hourly_rate_min'] = str(min(rates))
        result['hourly_rate_max'] = str(max(rates))
        result['subject_price'] = str(rates[0])
    if re.search(r'\b(?:online|trực tuyến)\b', compact, re.IGNORECASE) and re.search(r'\b(?:offline|tại nhà|trực tiếp)\b', compact, re.IGNORECASE):
        result['teaching_mode'] = 'both'
    elif re.search(r'\b(?:online|trực tuyến)\b', compact, re.IGNORECASE):
        result['teaching_mode'] = 'online'
    elif re.search(r'\b(?:offline|tại nhà|trực tiếp)\b', compact, re.IGNORECASE):
        result['teaching_mode'] = 'offline'
    result['bio'] = compact[:2000] if compact else ''
    return {key: value for key, value in result.items() if value not in ('', None)}


def tutor_extract_cv(request):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    upload = request.FILES.get('cv_file')
    if upload is None:
        return JsonResponse({'ok': False, 'message': 'Vui lòng chọn tệp CV.'}, status=400)
    try:
        text = _cv_text(upload)
        if len(text.strip()) < 20:
            raise ValueError('Không tìm thấy chữ có thể đọc trong CV. PDF scan/ảnh hiện chưa hỗ trợ OCR; hãy dùng PDF có thể bôi đen văn bản hoặc DOCX.')
        values = _tutor_cv_values(text)
    except (ValueError, ImportError, OSError) as exc:
        return JsonResponse({'ok': False, 'message': str(exc) or 'Không thể đọc CV.'}, status=400)
    if not values:
        return JsonResponse({'ok': False, 'message': 'Không nhận diện được thông tin để tự điền. Vui lòng nhập thủ công.'}, status=422)
    return JsonResponse({'ok': True, 'values': values, 'message': 'Đã điền các thông tin nhận diện được. Vui lòng kiểm tra trước khi lưu.'})


def _tutor_redirect(request, message, *, error=False):
    (messages.error if error else messages.success)(request, message)
    return redirect('management-page', module='tutors')


def _tutor_form_values(request, tutor=None):
    name = request.POST.get('name', '').strip()
    email = request.POST.get('email', '').strip().lower()
    subject_name = request.POST.get('subject_name', '').strip()
    province_id = request.POST.get('province_id', '').strip()
    ward_id = request.POST.get('ward_id', '').strip()
    teaching_mode = request.POST.get('teaching_mode', '').strip().lower()
    status = request.POST.get('status', Tutor.STATUS_ACTIVE).strip().lower()
    # Accounts created from the admin form receive the requested initial
    # password even if a client submits the form without its prefilled value.
    password = request.POST.get('password', '') or ('123456789' if tutor is None else '')
    if not all((name, email, subject_name, province_id, ward_id)):
        raise ValueError('Họ tên, email, môn dạy và khu vực dạy không được để trống.')
    if teaching_mode not in ('online', 'offline', 'both'):
        raise ValueError('Hình thức dạy không hợp lệ.')
    if status not in Tutor.STATUS_CHOICES:
        raise ValueError('Trạng thái gia sư chỉ có thể là active hoặc inactive.')
    if tutor is None and not password:
        raise ValueError('Mật khẩu đăng nhập là bắt buộc khi tạo gia sư.')
    if password and len(password) < 8:
        raise ValueError('Mật khẩu phải có ít nhất 8 ký tự.')
    if password and len(password.encode('utf-8')) > 72:
        raise ValueError('Mật khẩu không được vượt quá 72 byte.')
    email_query = Tutor.objects(email=email)
    if tutor:
        email_query = email_query.filter(id__ne=tutor.id)
    if email_query.first():
        raise ValueError('Email này đã được sử dụng bởi gia sư khác.')
    subject = Subject.objects(name__iexact=subject_name).first()
    if subject is None:
        subject = Subject(slug=_catalogue_slug(Subject, subject_name, 'subject'), name=subject_name).save()
    province = Province.objects(id=province_id).first()
    ward = Ward.objects(id=ward_id, province=province).first() if province else None
    if ward is None:
        raise ValueError('Xã/phường/đặc khu không thuộc tỉnh/thành phố đã chọn.')
    minimum = _optional_nonnegative_int(request.POST.get('hourly_rate_min', ''), 'Học phí tối thiểu')
    maximum = _optional_nonnegative_int(request.POST.get('hourly_rate_max', ''), 'Học phí tối đa')
    if minimum is not None and maximum is not None and minimum > maximum:
        raise ValueError('Học phí tối thiểu không được lớn hơn học phí tối đa.')
    return {
        'name': name, 'email': email, 'phone': request.POST.get('phone', '').strip() or None,
        'headline': request.POST.get('headline', '').strip() or None,
        'bio': request.POST.get('bio', '').strip() or None,
        'education_level': request.POST.get('education_level', '').strip() or None,
        'experience_years': _optional_nonnegative_int(request.POST.get('experience_years', '0'), 'Số năm kinh nghiệm') or 0,
        'hourly_rate_min': minimum, 'hourly_rate_max': maximum, 'teaching_mode': teaching_mode,
        'status': status, 'is_verified': True, 'password': password, 'subject': subject,
        'province': province, 'ward': ward,
        'subject_level': request.POST.get('subject_level', '').strip() or None,
        'subject_price': _optional_nonnegative_int(request.POST.get('subject_price', ''), 'Học phí môn dạy'),
        'avatar_upload': request.FILES.get('avatar'),
    }


def _save_tutor_relations(tutor, values):
    TutorSubject.objects(tutor=tutor).delete()
    TutorTeachingArea.objects(tutor=tutor).delete()
    TutorSubject(tutor=tutor, subject=values['subject'], level=values['subject_level'], price_per_hour=values['subject_price']).save()
    TutorTeachingArea(tutor=tutor, province=values['province'], ward=values['ward']).save()


def tutor_create(request):
    if request.method != 'POST':
        return redirect('management-page', module='tutors')
    try:
        values = _tutor_form_values(request)
        tutor = Tutor(slug=_catalogue_slug(Tutor, values['name'], 'tutor'))
        for field in ('name', 'email', 'phone', 'headline', 'bio', 'education_level', 'experience_years', 'hourly_rate_min', 'hourly_rate_max', 'teaching_mode', 'status', 'is_verified'):
            setattr(tutor, field, values[field])
        tutor.set_password(values['password'])
        if values['avatar_upload']:
            asset = upload_tutor_avatar(values['avatar_upload'], tutor.slug)
            tutor.avatar, tutor.avatar_public_id = asset['secure_url'], asset['public_id']
        tutor.save()
        _save_tutor_relations(tutor, values)
    except (ValueError, ValidationError, NotUniqueError) as exc:
        return _tutor_redirect(request, str(exc) or 'Không thể tạo gia sư.', error=True)
    record_admin_activity(request, 'create', tutor)
    return _tutor_redirect(request, 'Tạo hồ sơ gia sư thành công.')


def tutor_edit(request, slug):
    if request.method != 'POST':
        return redirect('management-page', module='tutors')
    tutor = Tutor.objects(slug=slug).first()
    if tutor is None:
        return _tutor_redirect(request, 'Không tìm thấy gia sư.', error=True)
    try:
        values = _tutor_form_values(request, tutor)
        old_public_id = tutor.avatar_public_id
        for field in ('name', 'email', 'phone', 'headline', 'bio', 'education_level', 'experience_years', 'hourly_rate_min', 'hourly_rate_max', 'teaching_mode', 'status', 'is_verified'):
            setattr(tutor, field, values[field])
        if values['password']:
            tutor.set_password(values['password'])
        if values['avatar_upload']:
            asset = upload_tutor_avatar(values['avatar_upload'], tutor.slug)
            tutor.avatar, tutor.avatar_public_id = asset['secure_url'], asset['public_id']
        tutor.save()
        _save_tutor_relations(tutor, values)
        if values['avatar_upload'] and old_public_id and old_public_id != tutor.avatar_public_id:
            delete_asset(old_public_id)
    except (ValueError, ValidationError, NotUniqueError) as exc:
        return _tutor_redirect(request, str(exc) or 'Không thể cập nhật gia sư.', error=True)
    record_admin_activity(request, 'update', tutor)
    return _tutor_redirect(request, 'Cập nhật hồ sơ gia sư thành công.')


def tutor_send_credentials(request):
    """Reset selected tutor passwords and deliver the one-time credentials by email."""
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    try:
        payload = json.loads(request.body or '{}')
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'ok': False, 'message': 'Dữ liệu gửi lên không hợp lệ.'}, status=400)

    slugs = payload.get('slugs')
    if not isinstance(slugs, list) or not slugs:
        return JsonResponse({'ok': False, 'message': 'Vui lòng chọn ít nhất một gia sư.'}, status=400)
    if len(slugs) > 50 or any(not isinstance(slug, str) or not slug for slug in slugs):
        return JsonResponse({'ok': False, 'message': 'Danh sách gia sư không hợp lệ.'}, status=400)

    tutors = list(Tutor.objects(slug__in=list(set(slugs))))
    if len(tutors) != len(set(slugs)):
        return JsonResponse({'ok': False, 'message': 'Có gia sư không còn tồn tại. Vui lòng tải lại trang.'}, status=404)

    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    sent_count = 0
    failed_names = []
    # Open SMTP once for the whole selection. The old ``send_mail`` call opened
    # a new connection for every tutor, making a multi-recipient action appear
    # frozen even though it was still sending in the request.
    connection = get_connection(fail_silently=False)
    try:
        connection.open()
        for tutor in tutors:
            temporary_password = ''.join(secrets.choice(alphabet) for _ in range(12))
            try:
                EmailMessage(
                    subject='Thông tin đăng nhập tài khoản gia sư EduTutor',
                    body=(
                        f'Xin chào {tutor.name},\n\n'
                        'Tài khoản gia sư EduTutor của bạn đã được thiết lập.\n'
                        f'Email đăng nhập: {tutor.email}\n'
                        f'Mật khẩu tạm thời: {temporary_password}\n\n'
                        'Vui lòng đăng nhập và đổi mật khẩu ngay sau khi đăng nhập để bảo mật tài khoản. '
                        'Không chia sẻ thông tin này với bất kỳ ai.\n\n'
                        'Trân trọng,\nEduTutor'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[tutor.email],
                    connection=connection,
                ).send(fail_silently=False)
                tutor.set_password(temporary_password)
                tutor.save()
                record_admin_activity(request, 'reset_password', tutor)
                sent_count += 1
            except Exception:
                logger.exception('Could not send tutor credentials email: tutor_id=%s', tutor.id)
                failed_names.append(tutor.name)
    except Exception:
        logger.exception('Could not open SMTP connection for tutor credentials.')
        failed_names = [tutor.name for tutor in tutors]
    finally:
        connection.close()

    if not sent_count:
        return JsonResponse({'ok': False, 'message': 'Không thể gửi email. Vui lòng kiểm tra cấu hình SMTP rồi thử lại.'}, status=503)
    message = f'Đã gửi thông tin đăng nhập cho {sent_count} gia sư.'
    if failed_names:
        message += f' Không gửi được cho {len(failed_names)} gia sư; mật khẩu của họ không thay đổi.'
    return JsonResponse({'ok': True, 'message': message})


def tutor_delete(request, slug):
    if request.method != 'POST':
        return JsonResponse({'ok': False, 'message': 'Phương thức không hợp lệ.'}, status=405)
    tutor = Tutor.objects(slug=slug).first()
    if tutor is None:
        return JsonResponse({'ok': False, 'message': 'Không tìm thấy gia sư.'}, status=404)
    TutorSubject.objects(tutor=tutor).delete()
    TutorTeachingArea.objects(tutor=tutor).delete()
    delete_asset(tutor.avatar_public_id)
    tutor.delete()
    record_admin_activity(request, 'delete', tutor)
    return JsonResponse({'ok': True, 'message': 'Xóa gia sư thành công.'})


def management_page(request, module):
    if module == 'contacts':
        from core.admin_contacts import contacts
        return contacts(request)
    if module == 'activity-logs':
        return activity_logs(request)
    if module == 'administrators':
        config = _administrator_page_config()
    elif module == 'roles-permissions':
        config = _roles_permissions_page_config()
    elif module == 'blog':
        config = _blog_page_config(request.GET.get('tab', 'posts'))
    elif module == 'slides':
        config = _slides_page_config()
    elif module == 'locations':
        config = _location_page_config(request.GET.get('tab', 'provinces'))
    elif module == 'tutors':
        config = _tutors_page_config()
    else:
        config = _recruitment_page_config(module) or MANAGEMENT_PAGES.get(module)
    if config is None:
        return page_not_found(request)

    page = {
        **config,
        'key': module,
        'action_label': f"Thêm {config['singular']}",
        'can_manage': True,
        'can_create': True,
    }
    if module.startswith('tutor-'):
        # These pages are database-backed listings.  Do not expose the old
        # front-end-only add/delete controls until their write workflow exists.
        page['can_manage'] = False
        page['can_create'] = False
    if module == 'locations':
        page['can_manage'] = False
        page['can_create'] = False
        page['tabs'] = [
            {'label': 'Tỉnh & Thành phố', 'url': reverse('management-page', kwargs={'module': 'locations'}), 'active': config['tab'] == 'provinces'},
            {'label': 'Xã, Phường & Đặc khu', 'url': f"{reverse('management-page', kwargs={'module': 'locations'})}?tab=wards", 'active': config['tab'] == 'wards'},
        ]
    if module == 'tutor-jobs':
        page['can_manage'] = True
        page['can_create'] = True
        page['create_url'] = reverse('tutor-job-create')
    if module == 'tutors':
        page['can_create'] = True
        page['create_url'] = reverse('tutor-create')
    if module == 'slides':
        page['create_url'] = reverse('banner-create')
    if module == 'blog':
        page['tabs'] = [
            {'label': 'Bài viết', 'url': reverse('management-page', kwargs={'module': 'blog'}), 'active': config['tab'] == 'posts'},
            {'label': 'Danh mục Blog', 'url': f"{reverse('management-page', kwargs={'module': 'blog'})}?tab=categories", 'active': config['tab'] == 'categories'},
        ]
        page['create_url'] = reverse('blog-post-create') if config['tab'] == 'posts' else reverse('blog-category-create')
    if module == 'administrators':
        is_super_admin = request.admin_account.role == Admin.ROLE_SUPER_ADMIN
        # Every administrator can edit only their own account. Super Admins can
        # additionally create, delete and change another account's status.
        page['can_manage'] = True
        page['can_create'] = is_super_admin
        page['can_delete'] = is_super_admin
        page['can_toggle_status'] = is_super_admin
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
                'status_toggle_url': reverse('administrator-toggle-status', kwargs={'slug': admin.slug}),
                'avatar_url': admin.profile_image_url or (
                    reverse('administrator-avatar', kwargs={'slug': admin.slug})
                    if admin.profile_image else ''
                ),
                'role': admin.role,
                'permissions': ', '.join(admin.permissions or []),
                'managed_by_slug': admin.managed_by.slug if admin.managed_by else '',
                'status_code': str(admin.status),
                'is_current': admin.id == request.admin_account.id,
                'can_edit': admin.id == request.admin_account.id,
                'can_delete': is_super_admin and admin.id != request.admin_account.id,
            })
        elif module == 'tutor-jobs':
            job = config['records'][index - 1]
            row.update({
                'id': job.slug,
                'slug': job.slug,
                'edit_url': reverse('tutor-job-edit', kwargs={'slug': job.slug}),
                'delete_url': reverse('tutor-job-delete', kwargs={'slug': job.slug}),
                'status_toggle_url': reverse('tutor-job-toggle-status', kwargs={'slug': job.slug}),
                'form_values': json.dumps({
                    'title': job.title,
                    'subject_name': _recruitment_reference_name(job.subject),
                    'province_id': _recruitment_reference_id(job.province),
                    'ward_id': _recruitment_reference_id(job.ward),
                    'grade': job.grade or '',
                    'budget_min': job.budget_min if job.budget_min is not None else '',
                    'budget_max': job.budget_max if job.budget_max is not None else '',
                    'schedule_expect': job.schedule_expect or '',
                    'description': job.description,
                    'status': job.status,
                }),
            })
        elif module == 'tutors':
            tutor = config['records'][index - 1]
            # ``select_related()`` returns a list in MongoEngine.
            subject_link = next(iter(TutorSubject.objects(tutor=tutor).select_related()), None)
            area_link = next(iter(TutorTeachingArea.objects(tutor=tutor).select_related()), None)
            row.update({
                'id': tutor.slug,
                'slug': tutor.slug,
                'avatar_url': tutor.avatar or '',
                'edit_url': reverse('tutor-edit', kwargs={'slug': tutor.slug}),
                'delete_url': reverse('tutor-delete', kwargs={'slug': tutor.slug}),
                'form_values': json.dumps({
                    'name': tutor.name, 'email': tutor.email, 'phone': tutor.phone or '',
                    'headline': tutor.headline or '', 'bio': tutor.bio or '',
                    'education_level': tutor.education_level or '',
                    'experience_years': tutor.experience_years, 'hourly_rate_min': tutor.hourly_rate_min or '',
                    'hourly_rate_max': tutor.hourly_rate_max or '', 'teaching_mode': tutor.teaching_mode,
                    'video_url': tutor.video_url or '', 'status': tutor.status,
                    'subject_name': subject_link.subject.name if subject_link else '',
                    'subject_level': subject_link.level if subject_link and subject_link.level else '',
                    'subject_price': subject_link.price_per_hour if subject_link and subject_link.price_per_hour else '',
                    'province_id': str(area_link.province.id) if area_link else '',
                    'ward_id': str(area_link.ward.id) if area_link and area_link.ward else '',
                }),
            })
        elif module == 'blog':
            record = config['records'][index - 1]
            if config['tab'] == 'posts':
                row.update({
                    'id': record.slug,
                    'slug': record.slug,
                    'edit_url': reverse('blog-post-edit', kwargs={'slug': record.slug}),
                    'delete_url': reverse('blog-post-delete', kwargs={'slug': record.slug}),
                    'status_toggle_url': reverse('blog-post-toggle-status', kwargs={'slug': record.slug}),
                    'form_values': json.dumps({
                        'title': record.title,
                        'category_id': str(record.category.id) if record.category else '',
                        'excerpt': record.excerpt or '',
                        'content': record.content,
                        'status': record.status,
                    }),
                })
            else:
                row.update({
                    'id': record.slug,
                    'slug': record.slug,
                    'edit_url': reverse('blog-category-edit', kwargs={'slug': record.slug}),
                    'delete_url': reverse('blog-category-delete', kwargs={'slug': record.slug}),
                    'status_toggle_url': reverse('blog-category-toggle-status', kwargs={'slug': record.slug}),
                    'form_values': json.dumps({'name': record.name, 'status': str(0 if record.status == 0 else 1)}),
                })
        elif module == 'slides':
            banner = config['records'][index - 1]
            row.update({
                'id': str(banner.id),
                'slug': str(banner.id),
                'image_url': banner.image,
                'edit_url': reverse('banner-edit', kwargs={'banner_id': banner.id}),
                'delete_url': reverse('banner-delete', kwargs={'banner_id': banner.id}),
                'status_toggle_url': reverse('banner-toggle-status', kwargs={'banner_id': banner.id}),
                'form_values': json.dumps({
                    'title': banner.title or '',
                    'link_url': banner.link_url or '',
                    'sort_order': banner.sort_order,
                    'status': banner.status,
                }),
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

    if module == 'tutor-jobs':
        province_choices = [
            {'value': str(province.id), 'label': province.name}
            for province in Province.objects.order_by('name')
        ]
        ward_choices = [
            {
                'value': str(ward.id),
                'label': f'{ward.name} — {ward.province.name}',
                'province_id': str(ward.province.id),
            }
            for ward in Ward.objects.order_by('province', 'name').select_related()
        ]
        page['form_fields'] = [
            {'name': 'title', 'label': 'Tiêu đề', 'type': 'text', 'placeholder': 'Ví dụ: Gia sư Toán lớp 12'},
            {'name': 'subject_name', 'label': 'Môn học', 'type': 'text', 'placeholder': 'Ví dụ: Toán học'},
            {'name': 'province_id', 'label': 'Tỉnh/thành phố', 'type': 'select', 'select_choices': True, 'choices': province_choices, 'empty_label': 'Chọn tỉnh/thành phố'},
            {'name': 'ward_id', 'label': 'Xã/Phường/Đặc khu', 'type': 'select', 'select_choices': True, 'choices': ward_choices, 'empty_label': 'Chọn tỉnh/thành phố trước'},
            {'name': 'grade', 'label': 'Khối/lớp (không bắt buộc)', 'type': 'text', 'placeholder': 'Ví dụ: Lớp 12', 'required': False},
            {'name': 'budget_min', 'label': 'Ngân sách tối thiểu (đ/giờ)', 'type': 'number', 'placeholder': 'Ví dụ: 150000', 'required': False},
            {'name': 'budget_max', 'label': 'Ngân sách tối đa (đ/giờ)', 'type': 'number', 'placeholder': 'Ví dụ: 250000', 'required': False},
            {'name': 'schedule_expect', 'label': 'Lịch mong muốn (không bắt buộc)', 'type': 'text', 'placeholder': 'Ví dụ: Tối thứ 2, 4, 6', 'required': False},
            {'name': 'description', 'label': 'Mô tả', 'type': 'textarea', 'placeholder': 'Mô tả yêu cầu công việc'},
            {'name': 'status', 'label': 'Trạng thái', 'type': 'select', 'options': ['open', 'closed']},
        ]
    if module == 'tutors':
        province_choices = [{'value': str(item.id), 'label': item.name} for item in Province.objects.order_by('name')]
        ward_choices = [
            {'value': str(item.id), 'label': f'{item.name} — {item.province.name}', 'province_id': str(item.province.id)}
            for item in Ward.objects.order_by('province', 'name').select_related()
        ]
        page['form_fields'] = [
            {'name': 'cv_file', 'label': 'Tự động điền từ CV', 'type': 'cv_extract', 'accept': '.pdf,.docx', 'extract_url': reverse('tutor-extract-cv')},
            {'name': 'name', 'label': 'Họ và tên', 'type': 'text', 'placeholder': 'Họ tên gia sư'},
            {'name': 'email', 'label': 'Email', 'type': 'email', 'placeholder': 'email@example.com'},
            {
                'name': 'password', 'label': 'Mật khẩu đăng nhập', 'type': 'password',
                'placeholder': 'Tối thiểu 8 ký tự; để trống khi không đổi',
                'value': '123456789', 'required': False,
            },
            {'name': 'phone', 'label': 'Số điện thoại', 'type': 'tel', 'placeholder': 'Không bắt buộc', 'required': False},
            {'name': 'avatar', 'label': 'Ảnh đại diện', 'type': 'file', 'accept': 'image/jpeg,image/png,image/webp,image/gif', 'required': False},
            {'name': 'headline', 'label': 'Tiêu đề CV', 'type': 'text', 'placeholder': 'Ví dụ: Gia sư Toán THPT · 5 năm kinh nghiệm', 'required': False},
            {'name': 'education_level', 'label': 'Học vấn', 'type': 'text', 'placeholder': 'Ví dụ: Cử nhân Sư phạm Toán', 'required': False},
            {'name': 'experience_years', 'label': 'Kinh nghiệm (năm)', 'type': 'number', 'placeholder': '0', 'required': False},
            {'name': 'subject_name', 'label': 'Môn dạy chính', 'type': 'text', 'placeholder': 'Ví dụ: Toán học'},
            {'name': 'subject_level', 'label': 'Cấp độ/lớp dạy', 'type': 'text', 'placeholder': 'Ví dụ: THCS, THPT', 'required': False},
            {'name': 'subject_price', 'label': 'Giá môn dạy (đ/giờ)', 'type': 'number', 'placeholder': 'Không bắt buộc', 'required': False},
            {'name': 'hourly_rate_min', 'label': 'Học phí từ (đ/giờ)', 'type': 'number', 'placeholder': 'Ví dụ: 150000', 'required': False},
            {'name': 'hourly_rate_max', 'label': 'Học phí đến (đ/giờ)', 'type': 'number', 'placeholder': 'Ví dụ: 250000', 'required': False},
            {'name': 'teaching_mode', 'label': 'Hình thức dạy', 'type': 'select', 'options': ['online', 'offline', 'both']},
            {'name': 'province_id', 'label': 'Tỉnh/thành phố', 'type': 'select', 'select_choices': True, 'choices': province_choices, 'empty_label': 'Chọn tỉnh/thành phố'},
            {'name': 'ward_id', 'label': 'Xã/Phường/Đặc khu', 'type': 'select', 'select_choices': True, 'choices': ward_choices, 'empty_label': 'Chọn tỉnh/thành phố trước'},
            {'name': 'bio', 'label': 'Giới thiệu CV', 'type': 'textarea', 'placeholder': 'Kinh nghiệm giảng dạy, thành tích, phương pháp dạy học...', 'required': False},
            {'name': 'status', 'label': 'Trạng thái tài khoản', 'type': 'select', 'options': ['active', 'inactive']},
        ]
    if module == 'slides':
        page['form_fields'] = [
            {'name': 'title', 'label': 'Tiêu đề', 'type': 'text', 'placeholder': 'Ví dụ: Khám phá gia sư phù hợp', 'required': False},
            {'name': 'image_file', 'label': 'Ảnh banner', 'type': 'file', 'accept': 'image/jpeg,image/png,image/webp,image/gif'},
            {'name': 'link_url', 'label': 'Liên kết khi nhấp', 'type': 'url', 'placeholder': 'https://... hoặc /tim-gia-su/', 'required': False},
            {'name': 'sort_order', 'label': 'Thứ tự hiển thị', 'type': 'number', 'placeholder': 'Ví dụ: 1'},
            {'name': 'status', 'label': 'Trạng thái', 'type': 'select', 'options': ['active', 'inactive']},
        ]
    if module == 'blog' and config['tab'] == 'posts':
        category_choices = [
            {'value': str(category.id), 'label': category.name}
            for category in BlogCategory.objects.order_by('name')
        ]
        page['form_fields'] = [
            {'name': 'title', 'label': 'Tiêu đề', 'type': 'text', 'placeholder': 'Nhập tiêu đề bài viết'},
            {'name': 'category_id', 'label': 'Chuyên mục', 'type': 'select', 'select_choices': True, 'choices': category_choices, 'empty_label': 'Chọn danh mục Blog'},
            {'name': 'excerpt', 'label': 'Tóm tắt', 'type': 'textarea', 'placeholder': 'Tóm tắt ngắn bài viết', 'required': False},
            {'name': 'thumbnail_image', 'label': 'Ảnh bìa', 'type': 'file', 'accept': 'image/jpeg,image/png,image/webp,image/gif', 'required': False},
            {'name': 'content', 'label': 'Nội dung', 'type': 'textarea', 'placeholder': 'Viết nội dung bài viết'},
            {'name': 'status', 'label': 'Trạng thái', 'type': 'select', 'options': ['draft', 'published']},
        ]
    if module == 'blog' and config['tab'] == 'categories':
        page['form_fields'] = [
            {'name': 'name', 'label': 'Tên danh mục', 'type': 'text', 'placeholder': 'Ví dụ: Kinh nghiệm học tập'},
            {
                'name': 'status', 'label': 'Trạng thái', 'type': 'select', 'select_choices': True,
                'choices': [{'value': '1', 'label': 'Active'}, {'value': '0', 'label': 'Inactive'}],
            },
        ]

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
    status = status_raw.strip().lower()
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
            'upload': upload,
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
        admin.slug = admin._make_unique_slug()
        if values['image']:
            uploaded_image = upload_admin_avatar(values['image']['upload'], admin.slug)
            admin.profile_image_url = uploaded_image['secure_url']
            admin.profile_image_public_id = uploaded_image['public_id']
        admin.save(force_insert=True)
    except (ValueError, ValidationError, NotUniqueError) as exc:
        message = str(exc) if isinstance(exc, ValueError) else 'Thông tin quản trị viên không hợp lệ hoặc bị trùng.'
        return _admin_management_redirect(request, message, error=True)

    record_admin_activity(request, 'create', admin)
    return _admin_management_redirect(request, f'Đã thêm quản trị viên {admin.name}.')


def administrator_edit(request, slug):
    if request.method != 'POST':
        return redirect('management-page', module='administrators')
    admin = Admin.objects(slug=slug).first()
    if admin is None:
        return _admin_management_redirect(request, 'Không tìm thấy quản trị viên.', error=True)
    if admin.id != request.admin_account.id:
        return _admin_management_redirect(request, 'Bạn chỉ có thể sửa tài khoản của chính mình.', error=True)

    try:
        values = _admin_form_values(request)
        duplicate = Admin.objects(email=values['email'], id__ne=admin.id).first()
        if duplicate:
            raise ValueError('Email này đã được sử dụng bởi quản trị viên khác.')
        # Role, permissions, manager and status are never self-editable.
        values['role'] = admin.role
        values['status'] = admin.status
        values['permissions'] = admin.permissions
        values['managed_by'] = admin.managed_by

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
            delete_asset(admin.profile_image_public_id)
            admin.profile_image = None
            admin.profile_image_name = ''
            admin.profile_image_content_type = ''
            admin.profile_image_url = ''
            admin.profile_image_public_id = ''
        if values['image']:
            previous_image_public_id = admin.profile_image_public_id
            uploaded_image = upload_admin_avatar(values['image']['upload'], admin.slug)
            if previous_image_public_id != uploaded_image['public_id']:
                delete_asset(previous_image_public_id)
            admin.profile_image = None
            admin.profile_image_name = ''
            admin.profile_image_content_type = ''
            admin.profile_image_url = uploaded_image['secure_url']
            admin.profile_image_public_id = uploaded_image['public_id']
        if password:
            admin.set_password(password)
        if password or access_changed:
            admin.session_version += 1
        admin.save()
    except (ValueError, ValidationError, NotUniqueError) as exc:
        message = str(exc) if isinstance(exc, ValueError) else 'Thông tin quản trị viên không hợp lệ hoặc bị trùng.'
        return _admin_management_redirect(request, message, error=True)

    record_admin_activity(request, 'update', admin)
    if password:
        record_admin_activity(request, 'change_password', admin)
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
    delete_asset(admin.profile_image_public_id)
    admin.delete()
    record_admin_activity(request, 'delete', admin)
    messages.success(request, f'Đã xóa quản trị viên {name}.')
    return JsonResponse({'ok': True})


def administrator_toggle_status(request, slug):
    """Toggle an administrator's active state (Super Admin only)."""
    def respond(ok, message, *, status=200, **payload):
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'ok': ok, 'message': message, **payload}, status=status)
        (messages.success if ok else messages.error)(request, message)
        return redirect('management-page', module='administrators')

    if request.method != 'POST':
        return respond(False, 'Phương thức không hợp lệ.', status=405)
    if not _require_super_admin(request):
        return respond(False, 'Chỉ Super Admin mới được đổi trạng thái quản trị viên.', status=403)

    admin = Admin.objects(slug=slug).first()
    if admin is None:
        return respond(False, 'Không tìm thấy quản trị viên.', status=404)
    if admin.id == request.admin_account.id:
        return respond(False, 'Bạn không thể vô hiệu hóa chính tài khoản đang đăng nhập.', status=400)

    next_status = (
        Admin.STATUS_INACTIVE
        if admin.status == Admin.STATUS_ACTIVE
        else Admin.STATUS_ACTIVE
    )
    if (
        next_status == Admin.STATUS_INACTIVE
        and admin.role == Admin.ROLE_SUPER_ADMIN
        and Admin.objects(role=Admin.ROLE_SUPER_ADMIN, status=Admin.STATUS_ACTIVE).count() <= 1
    ):
        return respond(False, 'Hệ thống phải còn ít nhất một Super Admin đang hoạt động.', status=400)

    # Update only the fields involved. This also supports legacy accounts whose
    # optional avatar URL is empty and would otherwise fail full-document validation.
    Admin.objects(id=admin.id).update_one(
        set__status=next_status,
        inc__session_version=1,
    )
    record_admin_activity(request, 'toggle_status', admin)
    active = next_status == Admin.STATUS_ACTIVE
    return respond(
        True,
        f"Đã {'kích hoạt' if active else 'vô hiệu hóa'} tài khoản {admin.name}.",
        status='Active' if active else 'Inactive',
        status_code=next_status,
    )


def administrator_avatar(request, slug):
    admin = Admin.objects(slug=slug).only(
        'profile_image',
        'profile_image_content_type',
        'profile_image_url',
    ).first()
    if admin is None:
        return HttpResponse(status=404)
    if admin.profile_image_url:
        return redirect(admin.profile_image_url)
    if not admin.profile_image:
        return HttpResponse(status=404)
    response = HttpResponse(
        bytes(admin.profile_image),
        content_type=admin.profile_image_content_type or 'application/octet-stream',
    )
    response['Cache-Control'] = 'private, max-age=3600'
    return response


def dashboard(request):
    welcome_email = request.session.pop('dashboard_welcome_email', '')
    today = datetime.now(timezone.utc).date()
    week_end = today + timedelta(days=7)
    paid_payments = Payment.objects(status='paid')
    revenue = sum(payment.total_amount or 0 for payment in paid_payments)
    upcoming_lessons = list(
        Lesson.objects(session_date__gte=today, session_date__lte=week_end)
        .order_by('session_date', 'start_time').limit(6).select_related()
    )
    recent_applications = list(TutorApplication.objects.order_by('-created_at').limit(5))
    paid_count = paid_payments.count()

    dashboard_data = {
        'today_label': today.strftime('%d/%m/%Y'),
        'stats': [
            {'label': 'Học viên đang hoạt động', 'value': Student.objects(status='active').count(), 'detail': f"{Student.objects.count()} học viên trong hệ thống", 'icon': 'students', 'url': reverse('students')},
            {'label': 'Gia sư đang hoạt động', 'value': Tutor.objects(status=Tutor.STATUS_ACTIVE).count(), 'detail': f"{Tutor.objects(status=Tutor.STATUS_INACTIVE).count()} tài khoản đang tạm ngưng", 'icon': 'tutors', 'url': reverse('management-page', kwargs={'module': 'tutors'})},
            {'label': 'Lớp học 7 ngày tới', 'value': len(upcoming_lessons), 'detail': f"Từ hôm nay đến {week_end.strftime('%d/%m')}", 'icon': 'calendar', 'url': reverse('management-page', kwargs={'module': 'schedules'})},
            {'label': 'Doanh thu đã thanh toán', 'value': _format_currency(revenue), 'detail': f'{paid_count} giao dịch thành công', 'icon': 'wallet', 'url': reverse('management-page', kwargs={'module': 'payments'})},
        ],
        'tasks': [
            {'title': 'Duyệt hồ sơ gia sư', 'count': TutorApplication.objects(status='pending').count(), 'description': 'Hồ sơ mới đang chờ kiểm tra', 'url': reverse('management-page', kwargs={'module': 'tutor-approvals'}), 'tone': 'violet'},
            {'title': 'Yêu cầu tìm gia sư', 'count': LearningRequest.objects(status='pending').count(), 'description': 'Yêu cầu học cần được phản hồi', 'url': reverse('management-page', kwargs={'module': 'tutor-requests'}), 'tone': 'blue'},
            {'title': 'Tin tuyển dụng đang mở', 'count': JobPosting.objects(status='open').count(), 'description': 'Nhu cầu tuyển gia sư đang hiển thị', 'url': reverse('management-page', kwargs={'module': 'tutor-jobs'}), 'tone': 'green'},
        ],
        'lessons': [
            {'subject': _recruitment_reference_name(lesson.subject), 'student': _recruitment_reference_name(lesson.student), 'tutor': _recruitment_reference_name(lesson.tutor), 'time': f'{lesson.session_date.strftime("%d/%m")} · {lesson.start_time}–{lesson.end_time}', 'mode': 'Trực tuyến' if lesson.mode == 'online' else 'Trực tiếp'}
            for lesson in upcoming_lessons
        ],
        'applications': [
            {'name': application.name, 'email': application.email, 'created': _recruitment_date(application.created_at), 'status': _recruitment_status(application.status)}
            for application in recent_applications
        ],
    }
    return render(request, 'admin/dashboard.html', {'welcome_email': welcome_email, 'dashboard': dashboard_data})


def users(request):
    # Authentication accounts originate from registration/login. This page is
    # read-only and must never expose password hashes or creation controls.
    login_users = list(User.objects.order_by('-created_at'))
    return render(request, 'admin/user/users.html', {'login_users': login_users})


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

        record_admin_activity(request, 'update_profile', admin)
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
            record_admin_activity(request, 'logout_all', admin)

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

        record_admin_activity(request, 'update_email', admin)
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
            record_admin_activity(request, 'change_password', admin)
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
            and admin_session_is_valid(request.session)
            and request.session.get('admin_session_version') == admin.session_version
        ):
            return redirect('dashboard-slash')
        clear_admin_session(request.session)

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

        logged_in_at = datetime.now(timezone.utc)
        request.session.cycle_key()
        request.session.set_expiry(settings.ADMIN_SESSION_MAX_AGE)
        request.session['admin_id'] = int(admin.id)
        request.session['admin_session_version'] = admin.session_version
        request.session['admin_logged_in_at'] = logged_in_at.timestamp()
        request.session['dashboard_welcome_email'] = admin.email
        admin.last_login = logged_in_at
        Admin.objects(id=admin.id).update_one(set__last_login=admin.last_login)

        record_admin_activity(request, 'login', admin, actor=admin)
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
        record_admin_activity(request, 'logout', request.admin_account)

        request.session.flush()
    return redirect('login')


def request_password_reset(request):
    """Email a one-time reset link backed by the shared ``tokens`` collection."""
    if request.method != 'POST':
        return render(request, 'auth/forgot-password.html')

    email = request.POST.get('email', '').strip().lower()
    admin = Admin.objects(email=email, status=Admin.STATUS_ACTIVE).first()
    if admin is None:
        return render(request, 'auth/forgot-password.html', {
            'auth_error': 'Không tìm thấy tài khoản Admin đang hoạt động với email này.',
            'entered_email': email,
        }, status=404)

    now = datetime.now(timezone.utc)
    active_token = AuthToken.objects(
        user_type='admin', user_id=int(admin.id), purpose='password_reset', is_used=False,
    ).order_by('-created_at').first()
    if active_token and now - active_token.created_at < timedelta(seconds=60):
        return render(request, 'auth/forgot-password.html', {
            'auth_error': 'Vui lòng chờ 60 giây trước khi yêu cầu liên kết mới.',
            'entered_email': email,
        }, status=429)

    AuthToken.objects(
        user_type='admin', user_id=int(admin.id), purpose='password_reset', is_used=False,
    ).update(set__is_used=True, set__last_used_at=now)
    raw_token = f'{secrets.randbelow(1_000_000):06d}'
    reset_token = AuthToken(
        user_type='admin', user_id=int(admin.id), token=raw_token,
        purpose='password_reset', expires_at=now + timedelta(minutes=2),
    )
    reset_token.save()
    try:
        send_mail(
            subject='Mã OTP đặt lại mật khẩu EduTutor Admin',
            message=(
                f'Xin chào {admin.name},\n\n'
                f'Mã OTP đặt lại mật khẩu của bạn là: {raw_token}\n'
                'Mã chỉ có hiệu lực trong 2 phút.\n\n'
                'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[admin.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception('Could not send admin password reset OTP email.')
        reset_token.delete()
        return render(request, 'auth/forgot-password.html', {
            'auth_error': 'Không thể gửi email. Vui lòng kiểm tra SMTP rồi thử lại.',
            'entered_email': email,
        }, status=503)

    request.session['password_reset_token_id'] = int(reset_token.id)
    request.session['password_reset_admin_id'] = int(admin.id)
    return redirect('otp')


def forgot_password(request):
    """Backward-compatible alias; password resets now use URL tokens only."""
    return request_password_reset(request)

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
    token_id = request.session.get('password_reset_token_id')
    admin_id = request.session.get('password_reset_admin_id')
    reset_token = AuthToken.objects(
        id=token_id,
        user_type='admin',
        user_id=admin_id,
        purpose='password_reset',
        is_used=False,
    ).first() if token_id and admin_id else None
    if reset_token is None or reset_token.is_expired():
        return redirect('forgot-password')

    admin = Admin.objects(id=admin_id, status=Admin.STATUS_ACTIVE).first()
    if admin is None:
        return redirect('forgot-password')

    expires_at = reset_token.expires_at
    if expires_at.tzinfo is None:
        # MongoDB returns UTC datetimes without tzinfo by default.
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    context = {
        'reset_email': admin.email,
        'auth_success': f'Mã OTP đã được gửi tới {admin.email}. Mã có hiệu lực 2 phút.',
        'otp_expires_at': int(expires_at.timestamp()),
    }
    if request.method == 'POST':
        context.pop('auth_success', None)
        raw_code = request.POST.get('otp', '').strip()
        if len(raw_code) != 6 or not raw_code.isdigit() or not secrets.compare_digest(raw_code, reset_token.token):
            context['auth_error'] = 'Mã OTP không chính xác.'
            return render(request, 'auth/otp.html', context, status=400)
        reset_token.is_used = True
        reset_token.last_used_at = datetime.now(timezone.utc)
        reset_token.save()
        request.session.pop('password_reset_token_id', None)
        request.session['password_reset_verified_admin_id'] = int(admin.id)
        request.session['password_reset_verified_until'] = int(
            (datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp()
        )
        return redirect('reset-password')

    return render(request, 'auth/otp.html', context)

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


def reset_password_with_token(request):
    raw_token = request.GET.get('token') or request.POST.get('token', '')
    now = datetime.now(timezone.utc)
    reset_token = AuthToken.objects(
        token=raw_token, user_type='admin', purpose='password_reset', is_used=False,
    ).first() if raw_token else None
    if reset_token is not None:
        if reset_token.is_expired(now):
            return redirect('forgot-password')
        admin_id = reset_token.user_id
    else:
        admin_id = request.session.get('password_reset_verified_admin_id')
        verified_until = request.session.get('password_reset_verified_until', 0)
        if not admin_id or now.timestamp() > verified_until:
            return redirect('forgot-password')

    admin = Admin.objects(id=admin_id, status=Admin.STATUS_ACTIVE).first()
    if admin is None:
        return redirect('forgot-password')

    context = {'reset_token': raw_token}
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
            if reset_token is not None:
                reset_token.is_used = True
                reset_token.last_used_at = now
                reset_token.save()
            record_admin_activity(request, 'reset_password', admin, actor=admin)

            request.session.flush()
            request.session['password_reset_success'] = 'Mật khẩu đã được cập nhật.'
            return redirect('login')

        context['auth_error'] = form_error
        return render(request, 'auth/reset-password.html', context, status=400)

    return render(request, 'auth/reset-password.html', context)


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
            record_admin_activity(request, 'reset_password', admin, actor=admin)

            request.session.flush()
            request.session['password_reset_success'] = 'Mật khẩu đã được cập nhật.'
            return redirect('login')

        return render(request, 'auth/reset-password.html', {
            'auth_error': form_error,
        }, status=400)

    return render(request, 'auth/reset-password.html')


def page_not_found(request, exception=None, **kwargs):
    return render(request, 'error/not-found.html', status=404)
