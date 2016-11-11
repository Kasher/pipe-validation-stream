var ValidationStream = require('../index.js');
var PassThrough = require('stream').PassThrough;

var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var should = chai.should();


var createStreams = function(bytesCount, validationCallback, validationFailedCallback, validationErrorCallback, disposeCallback) {
    var beforeStream = new PassThrough();
    var afterStream = new PassThrough();
    var validationStream = new ValidationStream.ValidationStream(bytesCount, validationCallback);

    if (disposeCallback) {
        validationStream.on(ValidationStream.DISPOSE_EVENT, disposeCallback);
    }
    if (validationFailedCallback) {
        validationStream.on(ValidationStream.VALIDATION_FAILED_EVENT, validationFailedCallback);
    }
    if (validationErrorCallback) {
        validationStream.on(ValidationStream.VALIDATION_ERROR_EVENT, validationErrorCallback);
    }

    beforeStream.pipe(validationStream).pipe(afterStream);

    return {
        beforeStream: beforeStream,
        afterStream: afterStream,
        validationStream: validationStream
    };
}

describe('ValidationStream', function() {
    it('Validation passes', function(done) {
        var streams = createStreams(1, function() {
            return true;
        });

        var streamData = 'test1';

        streams.afterStream.on('data', function(data) {
            data.should.equal(data);
            done();
        });

        streams.beforeStream.write(streamData);
    });

    it('After stream doesn\'t get the data if not enough data was piped', function(done) {
        var streams = createStreams(100, function() {
            return true;
        });

        var streamData = 'test1';

        streams.afterStream.on('data', function(data) {
            done(new Error("no data should be piped to the afterStream..."));
        });

        streams.beforeStream.write(streamData);
        setTimeout(done, 100);
    });

    it('After stream doesn\'t get the data if validation fails', function(done) {
        var streams = createStreams(1, function() {
            return false;
        }, done);

        var streamData = 'test1';

        streams.afterStream.on('data', function(data) {
            done(new Error("no data should be piped to the afterStream..."));
        });

        streams.beforeStream.write(streamData);
    });

    it('After stream doesn\'t get the data if error is thrown during validation', function(done) {
        var errorFunc = function() {
            done(new Error("no data should be piped to the afterStream..."));
        };

        var streams = createStreams(1, function() {
            throw new Error('e');
        }, errorFunc, function() {
            done();
        });

        var streamData = 'test1';

        streams.afterStream.on('data', errorFunc);

        streams.beforeStream.write(streamData);
    });

    it('Dispose function is called after validation passes and previous stream ended.', function(done) {
        var streams = createStreams(1, function() {
            return true;
        }, null, null, function() {
            done();
        });
        var streamData = 'test1';
        streams.beforeStream.end(streamData);
    });

    it('Dispose function is called after validation fails', function(done) {
        var streams = createStreams(1, function() {
            return false;
        }, null, null, function() {
            done();
        });
        var streamData = 'test1';
        streams.beforeStream.write(streamData);
    });

    it('Dispose function is called after validation error', function(done) {
        var streams = createStreams(1, function() {
            throw new Error('a');
        }, null, null, function() {
            done();
        });
        var streamData = 'test1';
        streams.beforeStream.write(streamData);
    });
});