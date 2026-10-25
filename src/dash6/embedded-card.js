import {scopedCustomElements as customElements} from './scoped-elements.js';
// Liquid Glass adapter for the separately installed Embedded View Card.
// Upstream owns view resolution, visibility, live updates and the editor.
// The pinned implementation is loaded by integration-bootstrap before this bundle.
const TYPE = 'custom:dash6-embedded-view-card';

async function registerEmbeddedAdapter() {
  await Promise.all([
    customElements.whenDefined('embedded-view-card'),
    customElements.whenDefined('embedded-view-card-editor'),
  ]);
  const Card = customElements.get('embedded-view-card');
  const Editor = customElements.get('embedded-view-card-editor');
  // These extension points are verified for the pinned upstream commit. Fail
  // explicitly if a separately managed resource has an incompatible API.
  if (typeof Card.prototype._renderTarget !== 'function' ||
      typeof Editor.prototype._normalizeConfig !== 'function') {
    throw new Error('Liquid Glass: incompatible Embedded View Card; install the supported pinned version.');
  }

  class LiquidGlassEmbeddedEditor extends Editor {
    _normalizeConfig(config) {
      return {...super._normalizeConfig(config), type: TYPE};
    }
  }

  class LiquidGlassEmbeddedCard extends Card {
    setConfig(config) {
      const signature = JSON.stringify(config);
      if (signature === this._liquidGlassConfigSignature) return;
      super.setConfig(config);
      this._liquidGlassConfigSignature = signature;
    }

    async _renderTarget(...args) {
      await super._renderTarget(...args);
      const rendered = this._activeViewElement;
      if (!rendered) return; // Upstream already displays lookup/visibility errors.
      // Wait for native hui-view's asynchronous initial layout before adapting
      // it. A second configuration on its unupgraded placeholder throws.
      await rendered._initialRenderComplete;
      if (this._activeViewElement !== rendered) return;
      const view = rendered.viewConfig;
      if (!view) throw new Error('Liquid Glass: Embedded View Card did not expose its view configuration.');
      // Bootstrap the native sections class before awaiting its Liquid Glass
      // subclass, as in the previous implementation.
      if (!customElements.get('hui-sections-view')) {
        if (typeof rendered._createLayoutElement !== 'function') {
          throw new Error('Liquid Glass: Home Assistant sections layout API is unavailable.');
        }
        rendered._createLayoutElement({...view, type: 'sections'});
      }
      await customElements.whenDefined('dash6-sections-view');
      if (this._activeViewElement !== rendered) return; // Target changed while waiting.
      const adapted = {...view, type: 'custom:dash6-sections-view'};
      const lovelace = rendered.lovelace;
      rendered.lovelace = {
        ...lovelace,
        editMode: false,
        config: {
          ...lovelace.config,
          views: lovelace.config.views.map((candidate, index) =>
            index === rendered.index ? adapted : candidate),
        },
      };
      rendered.viewConfig = adapted;
    }

    static getConfigElement() {
      return document.createElement('dash6-embedded-view-card-editor');
    }
    static getStubConfig() {
      return {...Card.getStubConfig(), type: TYPE};
    }
  }

  if (!customElements.get('dash6-embedded-view-card-editor')) {
    customElements.define('dash6-embedded-view-card-editor', LiquidGlassEmbeddedEditor);
  }
  if (!customElements.get('dash6-embedded-view-card')) {
    customElements.define('dash6-embedded-view-card', LiquidGlassEmbeddedCard);
    window.customCards ??= [];
    window.customCards.push({type: 'dash6-embedded-view-card', name: 'DASH6 Embedded View', description: 'Original Embedded View Card with Liquid Glass sections.', preview: false});
  }
}

registerEmbeddedAdapter().catch(error => console.error(error));
