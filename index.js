"use strict";

var util = require('util');
var Transform = require('stream').Transform;
var Promise = require('bluebird');

var VALIDATION_STATES = {
    NOT_VALIDATED: 0,
    VALIDATING: 1,
    VALIDATION_COMPLETED: 2
}

var bindAllMethods = function(instance) {
    for (var prop in instance) {
        if (typeof instance[prop] === "function") {
            instance[prop] = instance[prop].bind(instance);
        }
    }
}

var ValidationStream = /** @this */ function(requiredBytesCount, validationCallback) {
    var options = {
        objectMode: true,
        allowHalfOpen: false
    };

    Transform.call(this, options);

    this.initializeMembers(requiredBytesCount, validationCallback);
    bindAllMethods(this);

    return this;
}

util.inherits(ValidationStream, Transform);

ValidationStream.prototype.DISPOSE_EVENT = 'dispose';
ValidationStream.prototype.VALIDATION_FAILED_EVENT = 'validationFailed';
ValidationStream.prototype.VALIDATION_ERROR_EVENT = 'validationError';

ValidationStream.prototype.initializeMembers = function(requiredBytesCount, validationCallback) {
    this.validateState = VALIDATION_STATES.NOT_VALIDATED;
    this.flushCallback = null;
    this.disposed = false;
    this.validationFailed = false;
    this.requiredBytesCount = parseInt(requiredBytesCount, 10) || 0;
    this.validationCallback = validationCallback;
    this.buffer = new Buffer(0);
}

ValidationStream.prototype._transform = function(chunk, encoding, callback) {
    // If the stream was already disposed - we shouldn't do anything.
    if (this.disposed) {
        callback();
        return;
    }

    // If we have already validated everything - just process the chunk...
    if (this.validateState === VALIDATION_STATES.VALIDATION_COMPLETED)
        // If the validation completed and didn't fail, we'll push the chunk.
        if (!this.validationFailed) {
            this.pushIfNotDisposed(chunk);
        }

        callback();
        return;
    }

    // Concat the current buffer with the new chunk we have just got
    this.buffer = Buffer.concat([this.buffer, chunk]);

    // Currently validating, just appending the buffer.
    if (this.validateState === VALIDATION_STATES.NOT_VALIDATED &&
        this.buffer.length >= this.requiredBytesCount) {
        this.validate();
    }

    callback();
};

ValidationStream.prototype.validate = function() {
    this.validateState = VALIDATION_STATES.VALIDATING;

    var slicedBuffer = this.buffer.slice(0, this.requiredBytesCount);

    Promise.resolve().then(function() {
        if (this.validationCallback) {
            return this.validationCallback(slicedBuffer);
        }

        return false;
    }.bind(this)).then(function(validationResult) {
        var booleanValidationResult = Boolean(validationResult);
        if (booleanValidationResult) {
            this.pushIfNotDisposed(this.buffer);
        } else {
            this.validationFailed = true;
            this.emit(ValidationStream.prototype.VALIDATION_FAILED_EVENT);
            this.dispose();
        }
    }.bind(this)).catch(function(error) {
        this.emit(ValidationStream.prototype.VALIDATION_ERROR_EVENT, error);
        this.dispose();
    }.bind(this)).finally(function() {
        this.validateState = VALIDATION_STATES.VALIDATION_COMPLETED;

        if (this.flushCallback) {
            this.flushCallback();
            this.flushCallback = null;
        }
    }.bind(this));
}

ValidationStream.prototype.pushIfNotDisposed = function(chunk) {
    if (this.disposed) {
        return;
    }

    this.push(chunk);
}

ValidationStream.prototype._flush = function(callback) {
    this.flushCallback = function() {
        if (!this.validationFailed) {
            callback();
            this.dispose();
        }
    }.bind(this);

    if (this.validateState === VALIDATION_STATES.VALIDATION_COMPLETED) {
        this.flushCallback();
    } else if (this.validateState === VALIDATION_STATES.NOT_VALIDATED) {
        this.validate();
    }
};

ValidationStream.prototype.dispose = function() {
    if (this.disposed) {
        return;
    }

    this.emit(ValidationStream.prototype.DISPOSE_EVENT);
    this.disposed = true;
}

module.exports = {
    ValidationStream: ValidationStream,
    DISPOSE_EVENT: ValidationStream.prototype.DISPOSE_EVENT,
    VALIDATION_FAILED_EVENT: ValidationStream.prototype.VALIDATION_FAILED_EVENT,
    VALIDATION_ERROR_EVENT: ValidationStream.prototype.VALIDATION_ERROR_EVENT
}