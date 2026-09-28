from core.documents import Complaint
from lessons.documents import Review


def review_payload(review):
    return {
        'id': int(review.id), 'lesson_id': int(review.lesson.id),
        'student': review.student.name, 'tutor': review.tutor.name,
        'rating': review.rating, 'comment': review.comment,
        'admin_reply': review.admin_reply,
        'created_at': getattr(review, 'created_at', None),
    }


def complaint_payload(complaint):
    return {
        'id': int(complaint.id), 'sender_type': complaint.sender_type,
        'target_type': complaint.target_type, 'target_id': complaint.target_id,
        'target_label': complaint.target_label, 'content': complaint.content,
        'status': complaint.status, 'response_message': complaint.response_message,
        'response_sent_at': complaint.response_sent_at, 'created_at': complaint.created_at,
    }


def create_complaint(*, actor_type, actor, values):
    return Complaint(
        sender_type=actor_type, sender_id=int(actor.id), sender_name=actor.name,
        sender_email=actor.email, status='new', **values,
    ).save()
