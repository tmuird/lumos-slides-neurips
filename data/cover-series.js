// pharma sample 2260 (simulated, noise free): Raman spectrum and three weighted fluorophore spectra, max-pooled to 120 bins, base64 bytes
export const enc=['NEdBOzMtLi0nHxscEQ4VHntQCQYGAQAAAAABAQIHCxRISTs/OyQfDAoICAoRGissKxgVEwcDAQAAAAEFEiotDAkXGQ0LCgsNCwQKEBUTGzIzKysrKjM8Pz5WWF0yIBsYFxUUExEPDg0NDAwMDQ4QMT40EgcFBAIB',
'ExMTFBUWFxkaGx0fICIkJigqLC4wMjQ3OTs+QENFSEpNT1JUVllbXV9hY2VnaWpsbW5vcHFycnNzdHR0dHRzc3NycXFwb25tbGtpaGdlZGJhX15cW1lYVlRTUVBOTUtKSEdFREJBQD49PDo5ODc2NTQzMjEwMC8v',
'Ojs9P0FFSExQVFhdYWVqb3N4fYKGi5CVmZ6ip6ywtbq+w8fM0NTY3eDk5+rt8PL09vj6+/z9/v7///////7+/fz7+ff29PLw7uzp5+Xj4N7c2tfV09HOzMrIxsPBv726uLazsa+tq6impKOhn52cmpmYlpWUlJOT',
'AQEBAQICAgICAgICAgMDAwMDAwMEBAQEBQUFBgYHBwgICQoKCwwNDQ4PEBESExQWFxgaGx0eICIjJScpKy0vMTM1ODo9P0JER0pMT1JVWFtdYWRmam1vcnV4e36Ag4WHioyOkJKTlZeYmpudnp+hoqOkpaamp6en']
export const rates=[0.819,0.07,2.71]

// the same sample as { R, F, lam } for Surface3D
const S = enc.map(s => Array.from(atob(s), ch => ch.charCodeAt(0)))
export const coverSeries = { R: S[0], F: S.slice(1), lam: rates }
