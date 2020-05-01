import { GeoJSON as BaseGeoJSON, MVT, TopoJSON } from 'ol/format'
import { LineString } from 'ol/geom'
import { getLength } from 'ol/sphere'
import { isEmpty } from 'ol/obj'
import { createCircularPolygon } from './geom'
import { EPSG_4326, transformPoint } from './proj'
import { isCircle } from './util'

/**
 * @param {Object} [options]
 * @return {GeoJSON}
 */
export function createGeoJsonFmt (options) {
  return new GeoJSON(options)
}

/**
 * @param {Object} [options]
 * @return {TopoJSON}
 */
export function createTopoJsonFmt (options) {
  return new TopoJSON(options)
}

/**
 * @param [options]
 * @return {MVT}
 */
export function createMvtFmt (options) {
  return new MVT(options)
}

class GeoJSON extends BaseGeoJSON {
  writeGeometryObject (geometry, options) {
    if (isCircle(geometry)) {
      const start = geometry.getCenter()
      const end = [start[0] + geometry.getRadius(), start[1]]
      const radius = getLength(new LineString([start, end]), options.featureProjection || this.defaultFeatureProjection)
      geometry = createCircularPolygon(
        transformPoint(
          geometry.getCenter(),
          options.featureProjection || this.defaultFeatureProjection,
          EPSG_4326,
        ),
        radius,
      )
      options.featureProjection = EPSG_4326
    }
    return super.writeGeometryObject(geometry, options)
  }

  writeFeatureObject (feature, options) {
    const object = /** @type {Object} */ ({
      type: 'Feature',
    })
    const id = feature.getId()
    if (id !== undefined) {
      object.id = id
    }
    const geometry = feature.getGeometry()
    if (geometry) {
      object.geometry = this.writeGeometryObject(geometry, options)
    } else {
      object.geometry = null
    }
    const properties = feature.getProperties()
    delete properties[feature.getGeometryName()]
    if (!isEmpty(properties)) {
      object.properties = properties
    } else {
      object.properties = null
    }
    return object
  }
}
