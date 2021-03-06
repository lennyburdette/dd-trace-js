'use strict'

const BaseTracer = require('opentracing').Tracer
const NoopTracer = require('./noop/tracer')
const DatadogTracer = require('./tracer')
const Config = require('./config')
const Instrumenter = require('./instrumenter')
const platform = require('./platform')
const log = require('./log')

const noop = new NoopTracer()

class Tracer extends BaseTracer {
  constructor () {
    super()
    this._tracer = noop
    this._instrumenter = new Instrumenter(this)
    this._deprecate = method => log.deprecate(`tracer.${method}`, [
      `tracer.${method}() is deprecated.`,
      'Please use tracer.startSpan() and tracer.scope() instead.',
      'See: https://datadog.github.io/dd-trace-js/#manual-instrumentation.'
    ].join(' '))
  }

  init (options) {
    if (this._tracer === noop) {
      try {
        const service = platform.service()
        const config = new Config(service, options)

        if (config.enabled) {
          platform.validate()
          platform.configure(config)

          this._tracer = new DatadogTracer(config)
          this._instrumenter.enable()
          this._instrumenter.patch(config)
        }
      } catch (e) {
        log.error(e)
      }
    }

    return this
  }

  use () {
    this._instrumenter.use.apply(this._instrumenter, arguments)
    return this
  }

  trace (operationName, options, callback) {
    this._deprecate('trace')

    if (callback) {
      return this._tracer.trace(operationName, options, callback)
    } else if (options instanceof Function) {
      return this._tracer.trace(operationName, options)
    } else if (options) {
      return new Promise((resolve, reject) => {
        this._tracer.trace(operationName, options, span => resolve(span))
      })
    } else {
      return new Promise((resolve, reject) => {
        this._tracer.trace(operationName, span => resolve(span))
      })
    }
  }

  startSpan () {
    return this._tracer.startSpan.apply(this._tracer, arguments)
  }

  inject () {
    return this._tracer.inject.apply(this._tracer, arguments)
  }

  extract () {
    return this._tracer.extract.apply(this._tracer, arguments)
  }

  scopeManager () {
    this._deprecate('scopeManager')
    return this._tracer.scopeManager.apply(this._tracer, arguments)
  }

  scope () {
    return this._tracer.scope.apply(this._tracer, arguments)
  }

  currentSpan () {
    this._deprecate('currentSpan')
    return this._tracer.currentSpan.apply(this._tracer, arguments)
  }

  bind (callback) {
    this._deprecate('bind')
    return callback
  }

  bindEmitter () {
    this._deprecate('bindEmitter')
  }
}

module.exports = Tracer
