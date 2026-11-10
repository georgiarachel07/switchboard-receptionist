import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from calendar_store import book, slots


class CalendarTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        env = patch.dict(os.environ, DATABASE_PATH=str(Path(temp.name)/"test.db"))
        env.start()
        self.addCleanup(env.stop)
        self.day = (date.today()+timedelta(days=2)).isoformat()
        self.cfg = {"mode":"dental","timezone":"UTC","hours":{str(i):["09:00","17:00"] for i in range(7)}}

    def test_overlapping_calls(self):
        first, second = slots("cleaning",self.day,"morning",self.cfg)
        def attempt(call):
            try:
                return book(call,"cleaning",first,"fictional",self.cfg)
            except ValueError:
                return None
        with ThreadPoolExecutor(2) as pool:
            self.assertEqual(list(pool.map(attempt,["alice","bob"])).count(first),1)
        self.assertNotIn(second,slots("diagnostic",self.day,"morning",self.cfg))

    def test_service_bay_and_window(self):
        self.cfg["mode"]="auto"
        with self.assertRaises(ValueError):
            slots("waiting_bay",self.day,"morning",self.cfg)
        self.cfg["waiting_bay_enabled"]=True
        self.assertIn("T12:",slots("waiting_bay",self.day,"afternoon",self.cfg)[0])
        first=slots("drop_off",self.day,"morning",self.cfg)[0]
        self.assertEqual(book("retry","drop_off",first,"sample",self.cfg),first)
        self.assertEqual(book("retry","drop_off",first,"sample",self.cfg),first)
