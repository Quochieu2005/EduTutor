"""Efficient queries for the public subject catalogue."""

from tutors.documents import Subject, Tutor, TutorSubject


def active_tutor_ids():
    return {int(tutor_id) for tutor_id in Tutor.objects(status=Tutor.STATUS_ACTIVE).scalar('id')}


def tutor_ids_by_subject(*, subject_ids, active_ids=None):
    active_ids = active_ids if active_ids is not None else active_tutor_ids()
    result = {int(subject_id): set() for subject_id in subject_ids}
    if not result or not active_ids:
        return result
    for link in TutorSubject.objects(subject__in=list(result)).only('subject', 'tutor'):
        tutor_id = int(link.tutor.id) if hasattr(link.tutor, 'id') else int(link.tutor)
        if tutor_id in active_ids:
            subject_id = int(link.subject.id) if hasattr(link.subject, 'id') else int(link.subject)
            result.setdefault(subject_id, set()).add(tutor_id)
    return result


def subject_payload(subject, tutor_ids):
    return {
        'id': int(subject.id),
        'slug': subject.slug,
        'name': subject.name,
        'category': subject.category,
        'level': subject.level,
        'tutor_count': len(tutor_ids),
    }
