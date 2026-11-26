import json, sys, time, urllib.request, urllib.parse, os
out = sys.argv[1]
locs = {"utrecht":(52.09,5.12),"groningen":(53.22,6.57),"eindhoven":(51.44,5.48),"enschede":(52.22,6.89),"rotterdam":(51.92,4.48),"maastricht":(50.85,5.69)}
for name,(lat,lon) in locs.items():
    for y in range(2008, 2026):
        fn = f"{out}/{name}_{y}.json"
        if os.path.exists(fn) and os.path.getsize(fn) > 1000: continue
        q = dict(latitude=lat, longitude=lon, start_date=f"{y}-09-20", end_date=f"{y+1}-03-31", timezone="Europe/Amsterdam",
                 daily="temperature_2m_mean,temperature_2m_min,precipitation_sum,snowfall_sum,wind_gusts_10m_max",
                 hourly="temperature_2m,precipitation,snowfall,soil_temperature_0_to_7cm,soil_temperature_7_to_28cm,snow_depth")
        url = "https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode(q)
        for attempt in range(4):
            try:
                data = urllib.request.urlopen(url, timeout=120).read()
                json.loads(data); open(fn,"wb").write(data); break
            except Exception as e:
                print(name, y, "retry", e, file=sys.stderr); time.sleep(10*(attempt+1))
        time.sleep(1)
    print(name, "ok", flush=True)
