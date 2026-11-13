# The Black Belt

Code Black's crew-health dashboard for the 2026 NASA Space Apps Challenge.

## Run and demonstrate

Open index.html in Edge or Chrome. No install or build is required. Choose an indicator in Simulated mission, then log a check-in and export your local history. Use fictional readings in public demos. Browser-local storage is unencrypted and clearing site data removes records.

## Design and current scope

The dashboard shows heart rate, wrist skin temperature, exercise minutes, sleep hours, perceived stress, and manual cuff blood pressure. Demo data is synthetic. Trends and prior averages support review. Consult the mission medical protocol for health concerns.

We propose a band that combines optical pulse, motion, and contact temperature sensors. Next, we will build a physical prototype and compare its readings against reference devices. We also plan to integrate the sensors into a wearable, derive sleep and stress estimates from device data, validate cuffless blood pressure measurements, and enable opt-in syncing.
The radiation panel links to NASA's historical ISS DosTel1 archive. Importing dated measurements with their units and provenance is future work. The spacecraft environment and personal dose require separate measurements.

- [NASA human spaceflight hazards](https://www.nasa.gov/hrp/hazards/)
- [NASA OSDR environmental data](https://www.nasa.gov/reference/osdr-environmental-data/)
- [NASA RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-overview/)
- [Code Black concept video](https://youtu.be/FO5Ac6aqwcg)
