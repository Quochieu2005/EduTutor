"""Load the official 2026 two-tier Vietnamese administrative catalogue."""

import json
from pathlib import Path
from urllib.request import urlopen

from django.core.management.base import BaseCommand, CommandError

from tutors.documents import Province, Ward


SOURCE_URL = (
    'https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/'
    'master/json/full_json_generated_data_vn_units.json'
)
EXPECTED_PROVINCES = 34
EXPECTED_WARDS = 3321

def _read_json(path_or_url):
    if str(path_or_url).startswith(('http://', 'https://')):
        with urlopen(path_or_url, timeout=60) as response:  # nosec B310: fixed public dataset URL
            return json.loads(response.read().decode('utf-8'))
    return json.loads(Path(path_or_url).read_text(encoding='utf-8'))


class Command(BaseCommand):
    help = 'Seed 34 provinces and 3,321 wards/communes/special zones for Vietnam 2026.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source-file',
            help='JSON file with provinces and embedded wards. Defaults to the maintained 2026 public source.',
        )
        parser.add_argument('--apply', action='store_true', help='Write the validated catalogue to MongoDB.')

    def handle(self, *args, **options):
        provinces = _read_json(options.get('source_file') or SOURCE_URL)
        wards = [ward for province in provinces for ward in province['Wards']]

        if len(provinces) != EXPECTED_PROVINCES or len(wards) != EXPECTED_WARDS:
            raise CommandError(
                f'Dataset is invalid: expected {EXPECTED_PROVINCES} provinces and '
                f'{EXPECTED_WARDS} commune-level units; got {len(provinces)} and {len(wards)}.'
            )
        province_codes = {item['Code'] for item in provinces}
        if len(province_codes) != EXPECTED_PROVINCES:
            raise CommandError('Dataset has duplicate province codes.')
        if any(item.get('ProvinceCode') not in province_codes for item in wards):
            raise CommandError('A commune-level unit points to a missing province.')
        if len({item['Code'] for item in wards}) != EXPECTED_WARDS:
            raise CommandError('Dataset has duplicate commune-level unit codes.')

        self.stdout.write(
            f'Validated {EXPECTED_PROVINCES} provinces and {EXPECTED_WARDS} commune-level units.'
        )
        if not options['apply']:
            self.stdout.write(self.style.WARNING('Dry run only. Re-run with --apply to write to MongoDB.'))
            return

        province_by_code = {}
        created_provinces = updated_provinces = 0
        for item in provinces:
            code = item['Code']
            values = {
                'code': code,
                'slug': item['CodeName'].replace('_', '-'),
                'name': item['Name'],
            }
            province = Province.objects(code=code).first()
            if province is None:
                province = Province.objects(name=item['Name']).first()
            if province is None:
                province = Province(**values)
                province.save()
                created_provinces += 1
            else:
                Province.objects(id=province.id).update_one(**{f'set__{key}': value for key, value in values.items()})
                province.reload()
                updated_provinces += 1
            province_by_code[code] = province

        created_wards = updated_wards = 0
        for item in wards:
            code = item['Code']
            unit_type = {
                3: Ward.TYPE_WARD,
                4: Ward.TYPE_COMMUNE,
                5: Ward.TYPE_SPECIAL_ZONE,
            }.get(item['AdministrativeUnitId'])
            if unit_type is None:
                raise CommandError(f'Unknown commune-level unit type for code {code}.')
            values = {
                'code': code,
                # Names such as "Hưng Đạo" occur in more than one province.
                # The official code makes the application slug globally stable.
                'slug': f"{item['CodeName'].replace('_', '-')}-{code}",
                'name': item['Name'],
                'province': province_by_code[item['ProvinceCode']],
                'type': unit_type,
            }
            ward = Ward.objects(code=code).first()
            if ward is None:
                ward = Ward(**values)
                ward.save()
                created_wards += 1
            else:
                Ward.objects(id=ward.id).update_one(**{f'set__{key}': value for key, value in values.items()})
                updated_wards += 1

        self.stdout.write(self.style.SUCCESS(
            f'Location catalogue completed: {created_provinces} provinces created, '
            f'{updated_provinces} updated; {created_wards} commune-level units created, '
            f'{updated_wards} updated.'
        ))
