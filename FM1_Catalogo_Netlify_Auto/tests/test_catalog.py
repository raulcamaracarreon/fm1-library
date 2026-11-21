import sys
import unittest
from pathlib import Path
import json

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE / 'scripts'))
from update_catalog import normalize, changes


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((BASE / 'public' / 'catalog.json').read_text(encoding='utf-8'))

    def test_seed_has_unique_ids_and_hashes(self):
        arr = self.data['firmwares']
        self.assertEqual(len(arr), 282)
        self.assertEqual(len(set(x['id'] for x in arr)), 282)
        self.assertTrue(all(len(x['sha256']) == 64 for x in arr))

    def test_links_to_author_not_hub_mirror(self):
        arr = self.data['firmwares']
        self.assertTrue(all(x['repo'].startswith('https://github.com/') for x in arr))
        self.assertTrue(all('thefirmwarehub.com/fw/' not in x['release'] for x in arr))

    def test_delta_detects_new_updated_removed(self):
        old = {'firmwares': [{'id': 'a', 'version': '1', 'sha256': 'a'*64}, {'id': 'removed', 'version': '2', 'sha256': 'b'*64}]}
        new = {'sourceUpdated': 'test', 'firmwares': [{'id': 'a', 'version': '2', 'sha256': 'a'*64}, {'id': 'b', 'version': '1', 'sha256': 'a'*64}]}
        delta = changes(old, new)
        self.assertEqual(delta['new'], ['b'])
        self.assertEqual(delta['updated'], ['a'])
        self.assertEqual(delta['removed'], ['removed'])

    def test_normalization_rejects_small_incomplete_catalog(self):
        with self.assertRaises(ValueError): normalize({'firmwares': []})


if __name__ == '__main__':
    unittest.main()
