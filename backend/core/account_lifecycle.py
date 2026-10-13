"""Safe account removal helpers shared by the admin lifecycle handlers.

MongoEngine ``ReferenceField`` values are not cascaded by default.  Removing a
tutor/student that already has lessons or invoices would therefore leave a
DBRef that crashes readers on the next page load.  The admin delete handlers
call the explicit cascade functions below: dependent business records are
deleted in child-first order, login tokens are revoked, and the website
``User`` is removed only when it is not also the login for a parent, tutor or
administrator.
"""

from accounts.documents import Admin, AuthToken, Parent, Student, User, UserPasswordResetToken
from core.documents import (
    AdminNotification, Complaint, Invoice, NotificationDelivery, Payment, PaymentItem,
    Transaction,
)
from lessons.documents import LearningRequest, Lesson, Message, Review, TutorQuestion
from tutors.documents import (
    JobApplication, JobPosting, Tutor, TutorApplication, TutorAvailability,
    TutorSubject, TutorSubjectChangeRequest, TutorTeachingArea,
)


def revoke_auth_tokens(user_type, user_id):
    """Remove legacy persisted tokens and invalidate any JWT by model version."""
    try:
        AuthToken.objects(user_type=user_type, user_id=int(user_id)).delete()
    except (TypeError, ValueError):
        return


def remove_linked_user(email, *, profile_kind):
    """Remove the website login only when it belongs exclusively to a profile."""
    normalized = (email or '').strip().lower()
    if not normalized:
        return False
    user = User.objects(email=normalized).first()
    if user is None:
        return False
    # Parent and admin/tutor accounts may share the same email in legacy data;
    # never remove a login still needed by one of those account types.
    if Parent.objects(email=normalized).first() is not None:
        return False
    if profile_kind == 'tutor' and Student.objects(email=normalized).first() is not None:
        return False
    if profile_kind == 'student' and Tutor.objects(email=normalized).first() is not None:
        return False
    if Admin.objects(email=normalized).first() is not None:
        return False
    UserPasswordResetToken.objects(user=user).delete()
    user.delete()
    return True


def _delete_payment_dependents(payment_ids, *, lessons=None):
    """Delete children before their Payment/Lesson parent documents."""
    payment_ids = [payment_id for payment_id in payment_ids if payment_id is not None]
    lesson_ids = [lesson_id for lesson_id in (lessons or []) if lesson_id is not None]
    if payment_ids:
        PaymentItem.objects(payment__in=payment_ids).delete()
        Transaction.objects(payment__in=payment_ids).delete()
        Invoice.objects(payment__in=payment_ids).delete()
        AdminNotification.objects(payment__in=payment_ids).delete()
    if lesson_ids:
        PaymentItem.objects(lesson__in=lesson_ids).delete()
        Review.objects(lesson__in=lesson_ids).delete()


def _delete_actor_complaints(actor_type, actor_id):
    Complaint.objects(sender_type=actor_type, sender_id=int(actor_id)).delete()
    Complaint.objects(target_type=actor_type, target_id=int(actor_id)).delete()


def delete_tutor_cascade(tutor):
    """Hard-delete a tutor and every business record owned by that tutor."""
    tutor_id = int(tutor.id)
    lesson_ids = list(Lesson.objects(tutor=tutor).scalar('id'))
    payment_ids = list(Payment.objects(tutor=tutor).scalar('id'))
    job_ids = list(JobApplication.objects(tutor=tutor).scalar('id'))

    revoke_auth_tokens('tutor', tutor_id)
    _delete_payment_dependents(payment_ids, lessons=lesson_ids)
    # Messages point at learning requests; remove them before those requests
    # so the cascade never leaves a dangling request DBRef mid-operation.
    Message.objects(tutor=tutor).delete()
    Lesson.objects(tutor=tutor).delete()
    LearningRequest.objects(tutor=tutor).delete()
    Review.objects(tutor=tutor).delete()
    TutorQuestion.objects(tutor=tutor).delete()
    Payment.objects(tutor=tutor).delete()
    Invoice.objects(tutor=tutor).delete()
    _delete_actor_complaints('tutor', tutor_id)
    NotificationDelivery.objects(recipient_type='tutor', recipient_id=tutor_id).delete()
    JobApplication.objects(tutor=tutor).delete()
    TutorApplication.objects(onboarded_tutor=tutor).delete()
    TutorApplication.objects(email=tutor.email).delete()
    TutorSubjectChangeRequest.objects(tutor=tutor).delete()
    TutorSubject.objects(tutor=tutor).delete()
    TutorTeachingArea.objects(tutor=tutor).delete()
    TutorAvailability.objects(tutor=tutor).delete()
    tutor.delete()
    remove_linked_user(tutor.email, profile_kind='tutor')
    return {
        'lessons': len(lesson_ids), 'payments': len(payment_ids), 'applications': len(job_ids),
    }


def delete_student_cascade(student):
    """Hard-delete a student and all schedules/classes tied to that student."""
    student_id = int(student.id)
    lesson_ids = list(Lesson.objects(student=student).scalar('id'))
    payment_ids = list(Payment.objects(student=student).scalar('id'))
    job_posting_ids = list(JobPosting.objects(
        posted_by_type='student', posted_by_id=student_id,
    ).scalar('id'))

    revoke_auth_tokens('student', student_id)
    _delete_payment_dependents(payment_ids, lessons=lesson_ids)
    if job_posting_ids:
        JobApplication.objects(job_posting__in=job_posting_ids).delete()
        JobPosting.objects(id__in=job_posting_ids).delete()
    Message.objects(student=student).delete()
    Lesson.objects(student=student).delete()
    LearningRequest.objects(student=student).delete()
    Review.objects(student=student).delete()
    TutorQuestion.objects(student=student).delete()
    Payment.objects(student=student).delete()
    Invoice.objects(student=student).delete()
    _delete_actor_complaints('student', student_id)
    NotificationDelivery.objects(recipient_type='student', recipient_id=student_id).delete()
    student_email = student.email
    student.delete()
    remove_linked_user(student_email, profile_kind='student')
    return {
        'lessons': len(lesson_ids), 'payments': len(payment_ids), 'job_postings': len(job_posting_ids),
    }

