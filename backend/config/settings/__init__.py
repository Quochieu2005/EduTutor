"""Select development or production settings from the environment."""

import os


if os.getenv('RENDER') or os.getenv('DJANGO_ENV') == 'production':
    from .prod import *  # noqa: F403
else:
    from .dev import *  # noqa: F403
