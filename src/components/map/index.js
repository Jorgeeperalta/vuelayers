import { pick } from '../../utils'
import Map from './map.vue'
import View from './view.vue'

function plugin (Vue, options = {}) {
  if (plugin.installed) {
    return
  }
  plugin.installed = true

  options = pick(options, 'dataProjection')
  Object.assign(Map, options)
  Object.assign(View, options)

  Vue.component(Map.name, Map)
  Vue.component(View.name, View)
}

export default plugin

export {
  plugin as install,
  Map,
  View,
}
