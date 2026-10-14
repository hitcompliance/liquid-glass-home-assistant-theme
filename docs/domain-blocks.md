# Editable room domain blocks

`custom:dash6-domain-card` stores its configured cards in dashboard YAML. On a
dashboard URL containing `edit=1`, its floating cog opens a draft editor. Save
uses the containing Lovelace dashboard's supported `saveConfig` hook, saving the
card and regenerated exclusion registry together. No user-profile override or
direct REST/WebSocket dashboard write is used.

```yaml
type: custom:dash6-domain-card
dashboard: example-dashboard
view: office-content
block_id: lights
area: office
domain: light
heading: Lights
show_heading: true
auto_entities: true
columns: 2
mobile_columns: 1
mobile_breakpoint: 700
combine: true
cards:
  - type: custom:example-light-card
    entity: light.office
    power_entity: sensor.office_power
custom_cards: []
dynamic_card:
  type: tile
templates:
  - name: Native light
    card:
      type: tile
      entity: light.example
```

`area` accepts a registry area ID or an exact area name. `domain` is the original
Home Assistant domain, such as `light`, `sensor`, or `media_player`.
`auto_entities: false` keeps a special block's configured cards without adding
other domain members. `cards` and GUI-added `custom_cards` appear first; dynamic
entities appear afterwards using `dynamic_card`. Existing stack attributes and
the native heading style remain available. `show_heading: false` omits the title;
the cog still floats over the block in edit mode. Empty titled blocks become
visible in edit mode and hide in normal mode. The edit cog does not shift
populated content.

Blocks with `area` and `domain` use shared read-only entity/device/area registry
snapshots. Entity area overrides device area. Hidden (`user` or `integration`)
and disabled entities are omitted. Registry change events refresh the snapshots.
All blocks on the same connection reuse those reads, without a per-room Jinja
subscription. Existing blocks without these fields retain their inline queries.

The dashboard root contains a derived registry:

```yaml
dash6_registry:
  version: 1
  dashboards:
    example-dashboard:
      views:
        office-content:
          title: Office content
          sections:
            lights:
              domain: light
              area: office
              exclusions:
                - light.office
                - sensor.office_power
```

All entity references inside a configured custom card count, including segment
arrays, graphs, helpers, action targets, entity-keyed maps, and references in
templates. A service name such as `light.turn_on` is not an entity. Structural
cards recurse into configured cards; dynamic auto-entities queries are not
treated as static cards. Exclusions are combined across domain blocks in the
same view, including the parent and content views of embedded rooms. Thus a
light card's power sensor also disappears from the room's general sensor block.
Current card declarations regenerate stale exclusions at runtime and on Save.
The read-only `window.__dash6DomainRegistry` snapshot and the editor's global
exclusion list include loaded dashboards and previously persisted known
dashboards. They do not fetch unrelated dashboards. Publication is disabled
outside the active dashboard scope, including the isolated backup runtime.

Migration tools can import `buildDomainRegistry`, `extractEntityReferences`, and
`replaceDomainConfig` from `src/dash6/domain-registry.js` without browser globals.
Existing Favorites snapshots are unchanged; fresh area/domain sources can be
expanded lazily through the same room registry reader.
