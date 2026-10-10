# Terrain page scans and authored layers

Use **World settings → Terrain layers** to choose rock, sandy gravel or cracked mud, set footprint/coverage and place an elliptical patch below the camera. Place patches near the ground to inspect them. Later layers cover earlier layers; the arrow changes order and Remove deletes a layer. Height influence uses the material's height channel to reduce coverage where the layer sits below the underlying blend height. It does not displace terrain geometry.

Layer lists are kept in memory per configured world key. Returning to the same world restores its list during the session. Export/import JSON retains placements across reloads; imported material definitions are separate. The renderer permits 64 layers. The UI remains a placement tool; its appearance has not been checked in a working WebGL browser.

## Placement format

```json
{
  "version": 1,
  "decals": [
    {
      "material": "mud",
      "center": [0.27, 0.46, 0.846],
      "size": [128, 80],
      "opacity": 0.75,
      "rotation": 25,
      "heightBlend": 0.65,
      "tint": [1, 1, 1],
      "geology": "soil"
    }
  ]
}
```

`center` is a normalized planetary direction (the validator normalizes supplied directions). `size` is the full footprint in metres. Rotation is in degrees about the local radial direction. The ellipse has a soft border. `geology` is optional and multiplies coverage by soil, exposure, flow or shelter. `tileMetres` is optional; it defaults to the material's physical repeat size. Changing it deliberately rescales the source, so avoid enlarging metre-scale surface scans to create landforms. The worker evaluates every layer in order with the same world coordinates in adjacent page halos.

## Source scans and filtering

`python scripts/bake-page-scans.py` rebuilds `dist/page-scans.bin` from the existing rock, sand and mud colour, normal and packed surface maps. Each source is read at its native resolution. Colour is decoded from sRGB before box filtering. Roughness is stored as its fourth power; normal slope first/second moments preserve unresolved normal variance. Occlusion and blend height remain linear. Each material retains a 64²-to-1² mip pyramid, ten float channels per texel. The package is 656,426 bytes; it does not allocate new GPU textures.

The base repeats match the current scan projection: rock 3.24 m, sand 4 m, mud 2.25 m. Terrain pages have about 5.75 m spacing, so these scans resolve to their filtered averages in the page bank. Close-up scans still use the original independent textures. Baking this coarse bank does not create centimetre-resolution virtual texturing. Authored overlays blend from resident pages to two 256×128 coarse delta banks over 8–32 m footprints. The coarse banks filter placement coverage and retain albedo, roughness, occlusion and blend-height changes without extra samplers. This approximate 1.47 km fallback blurs small patches; RGBA8 quantization can discard very small coverage. It does not provide a full mip hierarchy.

## Registering additional materials

Advanced callers can register validated material pyramids with `planetExplorer.registerPageMaterials(materials)` and replace the current world's layer list with `planetExplorer.setSurfaceDecals(decals)`. Registrations preserve existing materials except matching IDs. No network fetch occurs in these calls. Treat registered data as immutable.

A material has `id`, `tileMetres`, and `levels` from a power-of-two resolution no larger than 64 down to 1. Each level has `size` and a `Float32Array` named `data`, with ten channels per texel:

| Channels | Meaning |
| --- | --- |
| 0–2 | Linear albedo RGB |
| 3 | Roughness to the fourth power |
| 4 | Occlusion |
| 5 | Blend height |
| 6–7 | Normal slopes X/Y |
| 8 | Mean squared normal slope magnitude |
| 9 | Opacity |

Mip filtering must average these channels before normal variance is computed. Up to 16 materials can be registered. The worker samples repeating UVs with bilinear/trilinear filtering, composes scan substrates and authored layers, projects the final gradient into the spherical tangent plane, and writes the existing albedo/surface/normal banks. Invalid registrations/layers are rejected before changing the active composition. The coarse shader fallback uses the same three scan averages through uniforms; custom authored overlays also use the resident coarse delta banks while pages load.

Changing layers invalidates page mappings with a new epoch. It preserves the coastal field and other atlas regions. Diagnostics report material/layer counts and the last worker composition CPU duration. Full browser visual/GPU acceptance and higher-resolution imported decal rendering remain open.
