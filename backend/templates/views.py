from django.shortcuts import redirect, render


def dashboard(request):
    welcome_email = request.session.pop('dashboard_welcome_email', '')
    return render(request, 'admin/dashboard.html', {'welcome_email': welcome_email})


def users(request):
    return render(request, 'admin/users.html')


def profile(request):
    profile_data = request.session.get('admin_profile', {
        'name': 'Guest User',
        'email': 'admin@edututor.local',
        'role': 'Administrator',
        'bio': 'Manage your EduTutor workspace and account preferences.',
    })

    if request.method == 'POST':
        profile_data = {
            'name': request.POST.get('name', '').strip() or 'Guest User',
            'email': request.POST.get('email', '').strip() or 'admin@edututor.local',
            'role': request.POST.get('role', '').strip() or 'Administrator',
            'bio': request.POST.get('bio', '').strip(),
        }
        request.session['admin_profile'] = profile_data
        return redirect('profile')

    return render(request, 'admin/setting/profile.html', {'profile': profile_data})


def account_settings(request):
    return render(request, 'admin/setting/account.html')


def appearance_settings(request):
    return render(request, 'admin/setting/appearance.html')


def notification_settings(request):
    return render(request, 'admin/setting/notifications.html')


def display_settings(request):
    return render(request, 'admin/setting/display.html')


def sign_in(request):
    if request.method == 'POST':
        request.session['dashboard_welcome_email'] = request.POST.get('email', '')
        return redirect('dashboard-slash')
    return render(request, 'auth/sign-in.html')


def forgot_password(request):
    return render(request, 'auth/forgot-password.html')


def otp(request):
    return render(request, 'auth/otp.html')


def page_not_found(request, exception=None, **kwargs):
    return render(request, 'error/not-found.html', status=404)
