"""Single-location appointment calendar. Times are local to the configured business."""
import os
import sqlite3
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

DURATIONS = {"cleaning": 60, "diagnostic": 30, "drop_off": 15, "waiting_bay": 60}


def connect():
    db = sqlite3.connect(os.getenv("DATABASE_PATH", "switchboard.sqlite3"), timeout=10)
    db.execute("""CREATE TABLE IF NOT EXISTS booking (
        call_id TEXT PRIMARY KEY, resource TEXT, start TEXT, finish TEXT, contact TEXT)""")
    return db


def resource_for(service, config):
    if service in ("cleaning", "diagnostic") and config["mode"] == "dental":
        return "chair"
    if service == "drop_off" and config["mode"] == "auto":
        return "intake"
    if service == "waiting_bay" and config["mode"] == "auto" and config.get("waiting_bay_enabled"):
        return "bay"
    raise ValueError("This service has no confirmed calendar resource. Offer staff follow-up.")


def available(db, resource, start, end):
    return not db.execute("SELECT 1 FROM booking WHERE resource=? AND start<? AND finish>?",
                          (resource, end.isoformat(), start.isoformat())).fetchone()


def slots(service, day, window, config):
    resource = resource_for(service, config)
    zone = ZoneInfo(config["timezone"])
    now = datetime.now(zone)
    first = date.fromisoformat(day)
    if not now.date() <= first <= now.date() + timedelta(days=180):
        raise ValueError("Choose a date within the next 180 days.")
    if window not in ("morning", "afternoon"):
        raise ValueError("Choose morning or afternoon.")
    choices = []
    with connect() as db:
        for offset in range(7):
            visit = first + timedelta(days=offset)
            hours = config["hours"].get(str(visit.weekday()))
            if not hours:
                continue
            start = datetime.combine(visit, time.fromisoformat(hours[0]))
            close = datetime.combine(visit, time.fromisoformat(hours[1]))
            while start + timedelta(minutes=DURATIONS[service]) <= close:
                end = start + timedelta(minutes=DURATIONS[service])
                if (start.replace(tzinfo=zone) > now and (start.hour < 12) == (window == "morning")
                        and available(db, resource, start, end)):
                    choices.append(start.isoformat())
                    if len(choices) == 2:
                        return choices
                start += timedelta(minutes=15)
    return choices


def book(call_id, service, start_text, contact, config):
    resource = resource_for(service, config)
    start = datetime.fromisoformat(start_text)
    end = start + timedelta(minutes=DURATIONS[service])
    if start.replace(tzinfo=ZoneInfo(config["timezone"])) <= datetime.now(ZoneInfo(config["timezone"])):
        raise ValueError("That time has passed. Check availability again.")
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        existing = db.execute("SELECT start,resource FROM booking WHERE call_id=?", (call_id,)).fetchone()
        if existing == (start_text, resource):
            return start_text
        if existing or not available(db, resource, start, end):
            raise ValueError("Booking conflict. Check open slots again.")
        db.execute("INSERT INTO booking VALUES (?,?,?,?,?)",
                   (call_id, resource, start_text, end.isoformat(), contact))
    return start_text
