import Collection from 'ol/Collection'
import Feature from 'ol/Feature'
import Vue from 'vue'
import { merge as mergeObs } from 'rxjs/observable'
import { tap } from 'rxjs/operators'
import { getFeatureId, getObjectUid, initializeFeature, mergeFeatures } from '../ol-ext'
import { instanceOf } from '../util/assert'
import { forEach, isPlainObject } from '../util/minilo'
import projTransforms from './proj-transforms'
import rxSubs from './rx-subs'
import { observableFromOlEvent } from '../rx-ext'

export default {
  mixins: [rxSubs, projTransforms],
  computed: {
    featureIds () {
      if (!this.rev) return []

      return this.getFeatures().map(getFeatureId)
    },
    featuresViewProj () {
      if (!this.rev) return []

      return this.getFeatures().map(::this.writeFeatureInViewProj)
    },
    featuresDataProj () {
      if (!this.rev) return []

      return this.getFeatures().map(::this.writeFeatureInDataProj)
    },
  },
  methods: {
    /**
     * @param {Array<(module:ol/Feature~Feature|Vue|Object)>} features
     * @return {void}
     */
    addFeatures (features) {
      forEach(features, ::this.addFeature)
    },
    /**
     * @param {module:ol/Feature~Feature|Vue|Object} feature
     * @return {void}
     */
    addFeature (feature) {
      if (feature instanceof Vue) {
        feature = feature.$feature
      } else if (isPlainObject(feature)) {
        feature = this.readFeatureInDataProj(feature)
      }
      instanceOf(feature, Feature)

      const foundFeature = this.getFeatureById(getFeatureId(feature))
      if (foundFeature == null) {
        initializeFeature(feature)
        this._featuresCollection.push(feature)
      } else {
        mergeFeatures(foundFeature, feature)
      }
    },
    /**
     * @param {Array<(module:ol/Feature~Feature|Vue|Object)>} features
     * @return {void}
     */
    removeFeatures (features) {
      forEach(features, ::this.removeFeature)
    },
    /**
     * @param {module:ol/Feature~Feature|Vue|Object} feature
     * @return {void}
     */
    removeFeature (feature) {
      feature = this.getFeatureById(getFeatureId(feature))
      if (!feature) return

      this._featuresCollection.remove(feature)
    },
    /**
     * @return {void}
     */
    clearFeatures () {
      this._featuresCollection.clear()
    },
    /**
     * @param {string|number} featureId
     * @return {module:ol/Feature~Feature|undefined}
     */
    getFeatureById (featureId) {
      return this._featuresCollection.getArray().find(feature => {
        return getFeatureId(feature) === featureId
      })
    },
    /**
     * @return {module:ol/Feature~Feature[]}
     */
    getFeatures () {
      return this._featuresCollection.getArray()
    },
    /**
     * @return {module:ol/Collection~Collection<module:ol/Feature~Feature>>}
     */
    getFeaturesCollection () {
      return this._featuresCollection
    },
    /**
     * @returns {Object}
     * @protected
     */
    getServices () {
      const vm = this

      return {
        get featuresContainer () { return vm },
      }
    },
  },
  created () {
    /**
     * @type {module:ol/Collection~Collection<module:ol/Feature~Feature>>}
     * @private
     */
    this._featuresCollection = new Collection()
    this._featureSubs = {}

    const add = observableFromOlEvent(this._featuresCollection, 'add')
      .pipe(
        tap(({ element }) => {
          const elementUid = getObjectUid(element)
          const propChanges = observableFromOlEvent(element, 'propertychange')
          const otherChanges = observableFromOlEvent(element, 'change')
          const featureChanges = mergeObs(propChanges, otherChanges)

          this._featureSubs[elementUid] = this.subscribeTo(featureChanges, () => {
            ++this.rev
          })
        })
      )
    const remove = observableFromOlEvent(this._featuresCollection, 'remove')
      .pipe(
        tap(({ element }) => {
          const elementUid = getObjectUid(element)
          if (!this._featureSubs[elementUid]) {
            return
          }

          this.unsubscribe(this._featureSubs[elementUid])
          delete this._featureSubs[elementUid]
        })
      )
    const events = mergeObs(add, remove)

    this.subscribeTo(events, () => {
      ++this.rev
    })
  },
}
