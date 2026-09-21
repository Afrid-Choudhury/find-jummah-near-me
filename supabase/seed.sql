-- Find Jummah Near Me — masjid seed data (Manhattan & Queens)
-- Sourced from Google Maps (Places API), July 2026. Names, addresses,
-- coordinates, phones, and websites come from each masjid's Google listing.
-- Jummah times are intentionally NOT seeded — enter and verify each schedule
-- through the admin dashboard, which stamps last_verified_at.
-- Amenities (women's section, capacity) are also left unset for the same
-- reason: set them in the dashboard as you verify each masjid.
-- Run AFTER migrations 0001 and 0002.

insert into public.masjids
  (name, slug, address, borough, neighborhood, latitude, longitude, phone, website)
values
  ('Masjid Malcolm Shabazz', 'masjid-malcolm-shabazz', '102 W 116th St, New York, NY 10026', 'Manhattan', 'Harlem', 40.8020169, -73.9502393, '(212) 662-2200', 'http://themasjidmalcolmshabazz.com'),
  ('Harlem Islamic Cultural Center', 'harlem-islamic-cultural-center', '108 E 128th St, New York, NY 10035', 'Manhattan', 'East Harlem', 40.8066127, -73.937135, '(212) 828-4422', 'https://hiccnyc.org'),
  ('Harlem Islamic Center', 'harlem-islamic-center', '2001 Adam Clayton Powell Jr Blvd, New York, NY 10027', 'Manhattan', 'Harlem', 40.8057434, -73.9502802, '(212) 866-2098', 'http://www.harlemcic.org'),
  ('The Mosque of Islamic Brotherhood', 'the-mosque-of-islamic-brotherhood', '130 W 113th St, New York, NY 10026', 'Manhattan', 'Harlem', 40.800718, -73.9528226, '(212) 662-4100', 'https://mosqueofislamicbrotherhood.org'),
  ('Islamic Cultural Center of New York', 'islamic-cultural-center-of-new-york', '1711 3rd Ave, New York, NY 10029', 'Manhattan', 'Upper East Side', 40.785534, -73.9485144, '(212) 722-5234', 'https://icc-ny.us'),
  ('Islamic Society of Mid Manhattan', 'islamic-society-of-mid-manhattan', '154 E 55th St, New York, NY 10022', 'Manhattan', 'Midtown East', 40.7590786, -73.9692446, '(212) 888-7838', null),
  ('Masjid Awliya of Allah', 'masjid-awliya-of-allah', '327 W 36th St, New York, NY 10018', 'Manhattan', 'Midtown West', 40.7542225, -73.9937345, '(347) 759-3245', null),
  ('Masjid Ar-Rahman', 'masjid-ar-rahman', '15 W 29th St, New York, NY 10001', 'Manhattan', 'NoMad', 40.7458746, -73.9879169, '(917) 705-6377', 'https://masjidarrahmannyc.org'),
  ('The Islamic Center of New York City', 'the-islamic-center-of-new-york-city', '350 6th Ave, New York, NY 10011', 'Manhattan', 'Greenwich Village', 40.7318736, -74.0006277, null, 'http://theicnyc.org'),
  ('Assafa Islamic Center', 'assafa-islamic-center', '172 Eldridge St, New York, NY 10002', 'Manhattan', 'Lower East Side', 40.7201732, -73.9907181, '(212) 253-1052', 'https://assafaislamiccenter.org'),
  ('Masjid Manhattan', 'masjid-manhattan', '30 Cliff St, New York, NY 10038', 'Manhattan', 'Financial District', 40.7081399, -74.005039, '(212) 766-1865', 'http://www.masjidmanhattan.com'),
  ('Al-Rahman Mosque', 'al-rahman-mosque', '575 W 175th St, New York, NY 10033', 'Manhattan', 'Washington Heights', 40.8454473, -73.9360839, '(929) 424-2125', null),
  ('Jamaica Muslim Center', 'jamaica-muslim-center', '85-37 168th St, Jamaica, NY 11432', 'Queens', 'Jamaica', 40.712634, -73.795754, '(718) 739-3182', 'http://jamaicamuslimcenter.org'),
  ('Darus Salaam Mosque', 'darus-salaam-mosque', '148-16 87th Rd, Jamaica, NY 11435', 'Queens', 'Jamaica', 40.706625, -73.808644, '(718) 558-6111', 'http://darussalaammasjid.com'),
  ('Fultoli Islamic Center', 'fultoli-islamic-center', '84-51 Parsons Blvd, Jamaica, NY 11432', 'Queens', 'Jamaica Hills', 40.7128769, -73.8063636, '(718) 526-4093', null),
  ('MUNA Center of South Jamaica', 'muna-center-of-south-jamaica', '164-38 108th Ave, Jamaica, NY 11433', 'Queens', 'South Jamaica', 40.6973093, -73.7890264, '(347) 593-6735', 'http://munasj.org'),
  ('Masjid Mission Center (Haji Camp)', 'masjid-mission-center-haji-camp', '87-26 175th St, Jamaica, NY 11432', 'Queens', 'Jamaica', 40.7108127, -73.7874962, '(347) 575-1110', 'https://masjidmissioncenter.org'),
  ('Astoria Islamic Center', 'astoria-islamic-center', '18-22 Astoria Blvd, Astoria, NY 11102', 'Queens', 'Astoria', 40.7721611, -73.9263424, '(718) 267-7409', null),
  ('Masjid Baitul Mukarram', 'masjid-baitul-mukarram', '22-21 33rd St, Astoria, NY 11105', 'Queens', 'Ditmars, Astoria', 40.774769, -73.9101135, '(718) 204-7562', null),
  ('Al-Iman Mosque', 'al-iman-mosque', '24-30 Steinway St, Long Island City, NY 11103', 'Queens', 'Steinway, Astoria', 40.768471, -73.9115833, '(718) 626-6633', null),
  ('Masjid El-Ber', 'masjid-el-ber', '36-05 30th St, Astoria, NY 11106', 'Queens', 'Astoria', 40.7567362, -73.9305515, null, null),
  ('Masjid Islamic Unity & Cultural Center', 'masjid-islamic-unity-cultural-center', '31-33 12th St, Astoria, NY 11106', 'Queens', 'Astoria', 40.7678551, -73.9339582, null, 'https://nyipg.com'),
  ('Hazrat Abu Bakr Siddique', 'hazrat-abu-bakr-siddique', '141-47 33rd Ave, Flushing, NY 11354', 'Queens', 'Flushing', 40.7683639, -73.8250889, '(718) 358-6905', 'http://masjid-abubakr.org'),
  ('Dar Al Taqwa Islamic Center', 'dar-al-taqwa-islamic-center', '40-20 159th St, Flushing, NY 11358', 'Queens', 'Flushing', 40.762515, -73.806804, '(718) 461-4931', 'https://daraltaqwa-ny.org'),
  ('Masjid Syed JamalUddin', 'masjid-syed-jamaluddin', '42-66 149th St, Flushing, NY 11355', 'Queens', 'Flushing', 40.758522, -73.8145337, '(718) 461-9078', 'https://www.msjanyc.org'),
  ('Muslim Center of New York', 'muslim-center-of-new-york', '137-58 Geranium Ave, Flushing, NY 11355', 'Queens', 'Flushing', 40.7508431, -73.8204482, '(718) 460-3000', 'https://muslimcenter.org'),
  ('Jackson Heights Islamic Center', 'jackson-heights-islamic-center', '71-20 Roosevelt Ave, Jackson Heights, NY 11372', 'Queens', 'Jackson Heights', 40.7463997, -73.8938814, '(718) 426-5841', null),
  ('Masjid Abu Huraira (ICJH)', 'masjid-abu-huraira-icjh', '78-04 31st Ave, East Elmhurst, NY 11370', 'Queens', 'East Elmhurst', 40.7586359, -73.88957, '(718) 424-8502', null),
  ('Masjid Dar-ul Furqan', 'masjid-dar-ul-furqan', '35-06 72nd St, Jackson Heights, NY 11372', 'Queens', 'Jackson Heights', 40.750532, -73.894216, '(718) 205-2930', null),
  ('Darul Hidayah Masjid', 'darul-hidayah-masjid', '37-18 73rd St, Jackson Heights, NY 11372', 'Queens', 'Jackson Heights', 40.7483797, -73.8928847, null, null),
  ('Ozone Park Islamic Center', 'ozone-park-islamic-center', '104-23 103rd St, Ozone Park, NY 11417', 'Queens', 'Ozone Park', 40.6810862, -73.8373002, '(347) 898-2660', 'http://ozoneparkislamiccenter.org'),
  ('Ozone Park Jame Masjid', 'ozone-park-jame-masjid', '91-03 101st Ave, Ozone Park, NY 11416', 'Queens', 'Ozone Park', 40.6835354, -73.8492559, '(646) 359-4873', null),
  ('Al-Furqan Jame Mosque', 'al-furqan-jame-mosque', '76-18 Glenmore Ave, Ozone Park, NY 11417', 'Queens', 'Ozone Park', 40.6778787, -73.8602739, '(646) 824-4814', 'https://alfurqanmasjid.org'),
  ('Masjid Al Jama', 'masjid-al-jama', '94-17 102nd St, Ozone Park, NY 11416', 'Queens', 'Ozone Park', 40.6887947, -73.841934, '(347) 681-5870', null),
  ('Islamic Center of Queens (Masjid Fatima)', 'islamic-center-of-queens-masjid-fatima', '57-16 37th Ave, Woodside, NY 11377', 'Queens', 'Woodside', 40.750001, -73.9045958, '(718) 803-3747', 'http://www.masjidfatima.org'),
  ('Sunnyside Muslim Center', 'sunnyside-muslim-center', '39-18 47th Ave, Long Island City, NY 11104', 'Queens', 'Sunnyside', 40.7417469, -73.9258357, '(646) 942-0772', 'https://www.smcmosque.com'),
  ('Sunnyside Woodside Jame Mosque', 'sunnyside-woodside-jame-mosque', '45-18 48th Ave, Woodside, NY 11377', 'Queens', 'Woodside', 40.7392246, -73.9196993, '(718) 482-7364', 'http://swjamemasjid.org'),
  ('Madani Mosque', 'madani-mosque', '41-51 69th St, Woodside, NY 11377', 'Queens', 'Woodside', 40.7430628, -73.8955422, '(718) 639-3498', 'https://madanimasjidnyc.org')
on conflict (slug) do nothing;
