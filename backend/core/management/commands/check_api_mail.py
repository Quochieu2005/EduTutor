"""Read-only SMTP diagnostic; sends ONE harmless message only with --send-to."""
from time import perf_counter

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.core.mail import EmailMessage, get_connection
from django.core.validators import validate_email


class Command(BaseCommand):
    help = 'Test configured mail transport without exposing credentials or changing passwords.'

    def add_arguments(self, parser):
        parser.add_argument('--send-to', default='')

    def handle(self, *args, **options):
        recipient = options['send_to']
        if recipient:
            validate_email(recipient)
        if settings.EMAIL_BACKEND != 'django.core.mail.backends.smtp.EmailBackend':
            raise CommandError('Configured backend is not SMTP; this command cannot verify real delivery.')
        self.stdout.write(f'SMTP port={settings.EMAIL_PORT}; TLS={settings.EMAIL_USE_TLS}; '
                          f'credentials_present={bool(settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD)}')
        started = perf_counter()
        try:
            with get_connection(timeout=8, fail_silently=False) as connection:
                self.stdout.write(f'SMTP connected/authenticated in {perf_counter() - started:.2f}s')
                if recipient:
                    accepted = EmailMessage(
                        subject='EduTutor - Kiểm thử gửi email API',
                        body=('Đây là email kiểm thử được gửi theo yêu cầu của bạn. '
                              'Không có mật khẩu hay tài khoản nào bị thay đổi. '
                              'Hãy xác nhận bạn nhận được email này (kiểm tra cả thư rác).'),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        to=[recipient], connection=connection,
                    ).send(fail_silently=False)
                    if accepted != 1:
                        raise RuntimeError('No message accepted')
                    self.stdout.write('SMTP accepted 1 test email. Inbox delivery still requires recipient confirmation.')
        except Exception as error:
            # Provider exception text can contain credentials/addresses; only
            # log the safe class and numeric SMTP status.
            code = getattr(error, 'smtp_code', None)
            raise CommandError(f'Mail check failed: {type(error).__name__}; code={code}; '
                               f'elapsed={perf_counter() - started:.2f}s') from None
