# EduTutor — Database Schema

EduTutor stores business data in **MongoDB** through MongoEngine. SQLite remains
enabled only for Django's own administration, sessions and migrations; it is not
the source of truth for application data.

The schema has 26 MongoDB collections. MongoEngine creates a collection and its
indexes when the corresponding document is first saved. References below are
MongoEngine `ReferenceField`s (the MongoDB equivalent of a foreign-key link).

## Collections

| Group | Collections | Purpose |
| --- | --- | --- |
| Accounts | `students`, `parents`, `tutors`, `admins` | Separate accounts and profiles by role. |
| Catalogue | `subjects`, `provinces`, `districts` | Tutor search filters. |
| Tutor service | `tutor_subjects`, `tutor_teaching_areas` | Subjects, levels, rates and offline areas. |
| Learning | `learning_requests`, `lessons`, `reviews`, `messages` | Requests, sessions, ratings and conversation. |
| Payments | `payments`, `payment_items`, `transactions`, `invoices` | Amount due, covered lessons, attempts and invoice. |
| Content | `blog_categories`, `blog_posts`, `contacts`, `banners` | CMS and marketing data. |
| Recruitment | `tutor_applications`, `job_postings`, `job_applications` | Tutor onboarding and parent/admin job posts. |
| Security/audit | `tokens`, `logs` | Tokens and append-only business audit records. |

## Document locations

| File | Documents |
| --- | --- |
| `backend/accounts/documents.py` | `Student`, `Parent`, `Admin`, `AuthToken` |
| `backend/tutors/documents.py` | Tutor, catalogue and recruitment documents |
| `backend/lessons/documents.py` | Learning request, lesson, review and message documents |
| `backend/core/documents.py` | Payment, CMS and audit documents |

`User` is a legacy collection left in the codebase only for backward compatibility.
New learner/parent accounts must be created in `students` or `parents`, never in
`users`.

## Key relationships

```text
parents 1 ── N students

tutors N ── N subjects       via tutor_subjects
tutors N ── N provinces      via tutor_teaching_areas

student/parent → learning_requests → lessons → reviews
                                  └→ messages

lessons → payment_items → payments → transactions
                                   └→ invoices (0..1)

job_postings → job_applications → tutors
```

## Core fields and constraints

### Accounts and catalogue

- `students.parent_id` is optional; one parent can manage many students.
- `students`, `parents` and `tutors` use independent profiles. OAuth identity is
  unique per collection on `(oauth_provider, oauth_uid)` when it is present.
- `admins` keeps the existing administrator fields and password/session behaviour.
- `subjects`, `provinces` and `districts` use unique slugs. A district belongs to
  one province.

### Tutor services and learning

- `tutor_subjects` is unique on `(tutor_id, subject_id, level)`.
- `tutor_teaching_areas` holds a province and optional district. A null district
  means the tutor accepts the whole province.
- Tutor `teaching_mode`: `online`, `offline`, or `both`.
- A `learning_request` moves through `pending`, `accepted`, `declined`, or
  `cancelled` before a lesson is scheduled.
- A lesson has exactly one mode: `online` requires `meeting_url`; `offline`
  requires `location`.
- A lesson has at most one review (`reviews.lesson_id` is unique).

### Payments and invoices

- Store VND values as integer fields, never floating point.
- `payments` is the amount due. `transactions` stores every attempt, so a failed
  VNPay attempt followed by a successful MoMo attempt is still one payment with
  two transactions.
- Supported transaction methods: `cash`, `bank_transfer`, `momo`, `zalopay`, and
  `vnpay`.
- `payment_items` is unique on `(payment_id, lesson_id)`; application logic must
  ensure its amounts add up to `payments.total_amount`.
- Only a successful transaction may change a payment to `paid`. A payment has no
  more than one invoice (`invoices.payment_id` is unique).

### Audit and security

- `tokens` supports `password_reset` and `access` purposes. Store only generated,
  random tokens and set an expiry for production access tokens.
- `logs` is append-only. It records actor, action, target, metadata and IP address;
  it is not an error log.

## Initialising locally

Set the following in `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=edututor
```

Run the Django checks. The schema command explicitly creates all 26 empty
collections and their indexes; normal application writes also create collections
lazily:

```powershell
cd backend
python manage.py check
```

### MongoDB Atlas

1. Create an Atlas cluster and a database user with `readWrite` access to the
   `edututor` database.
2. In Atlas **Network Access**, allow the IP address of the machine or hosting
   provider that runs Django.
3. Set `MONGODB_URI` as an environment variable (local `backend/.env` or the
   Render environment), using the SRV string copied from Atlas:

```env
MONGODB_URI=mongodb+srv://<username>:<url-encoded-password>@<cluster-host>/edututor?retryWrites=true&w=majority
MONGO_DB_NAME=edututor
```

4. Create the collections and indexes without inserting sample data:

```powershell
cd backend
python manage.py ensure_mongo_indexes --verify
```

`MONGODB_URI` takes precedence over `MONGO_URI`. Do not commit the URI or a
database password; `backend/.env` is local-only and `render.yaml` already marks
the production URI as a secret environment variable.

## Implementation notes

- All 26 domain collections use collection-local MongoEngine `SequenceField`
  values stored as signed 64-bit integers (`bigint`), including their references.
  This matches the agreed database design and keeps IDs suitable for reports.
- MongoDB does not enforce cross-collection foreign keys. Services must validate
  role-specific polymorphic IDs such as `payer_type`/`payer_id` and
  `requested_by_type`/`requested_by_id`.
- Document indexes declared in `meta.indexes` cover the documented uniqueness and
  common filter paths. Deploy with a MongoDB user allowed to create indexes.
