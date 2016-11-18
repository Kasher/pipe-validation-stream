# pipe-validation-stream
Easily validate streamed data in NodeJs

Introduction
--------
Ever needed to pipe data from one stream to another only if some validation passes? If so - this is the package for you. 
With this package you can create a validation-stream, and validate the streamed data while piping it from one stream to another.

Installation
--------
Install with `npm`:

``` bash
    npm install pipe-validation-stream
```

API
--------
Using ValidationStream is pretty easy. All you have to do is to create a ValidationStream using the constructor, and then you may use it as any other stream (pipe streams to it, pipe it to other streams, write to it, register to stream events, etc...).
The constructor gets 2 parameters: 
* __requiredBytesCount__ - The required amount of bytes needed for validation. The validation callback will be called only after at least requiredBytesCount bytes have been written to the stream.
* __validationCallback__ - The callback to be called for validation. The callback gets one parameter, which is a buffer with length of requiredBytesCount. The callback should return a boolean value, which is the validation result. You may return a promise as well if your validation is async.

In addition to the common stream API, ValidationStream may raise three kind of custom events:
* __ValidationStream.VALIDATION_FAILED_EVENT__ - This event will be raised if the validation failed. Of course, if the validation fails, no data will be written to the next stream (assuming the ValidationStream is piped to another stream).
* __ValidationStream.VALIDATION_ERROR_EVENT__ - This event will be raised if an error occurred during validation. 
* __ValidationStream.DISPOSE_EVENT__ - This event will be raised when there is no more use of the ValidationStream, and in this code you may release references to it, or actually execute any kind of cleaning code you want. This event is guaranteed to be raised even if the validation has failed, or if an error was raised somewhere along the way, or if the stream has closed, etc.


Examples
--------

Filter all files that start with the text "validation" (in order to execute this test, change listOfFiles to point to real files):

``` javascript

let ValidationStream = require('pipe-validation-stream');
let fs = require('fs');

let listOfFiles = ['a.txt', 'b.mp4', 'c.sh'];

for (let i = 0; i < listOfFiles.length; ++i) {
        let inputStream = fs.createReadStream(listOfFiles[i]);
        let outputStream = fs.createWriteStream(listOfFiles[i] + ".verified");
        let validationStream = new ValidationStream.ValidationStream(10, function(data) { 
                        return data.toString() === "validation";
                });

        validationStream.on(ValidationStream.VALIDATION_FAILED_EVENT, function() {
            console.log("Validation failed for: ", listOfFiles[i]);
            fs.unlink(listOfFiles[i]);
        })

        inputStream.pipe(validationStream).pipe(outputStream);
}

```


Now, lets get fancier: validate the true type of a file WHILE REQUESTING IT (i.e. - the file won't be saved on the computer unless the validation passes). We are validating that the requested file is really a mp4 file:

```javascript
let ValidationStream = require('pipe-validation-stream');
let fs = require('fs');
let mmmagic = require('mmmagic');
let Promise = require('bluebird');
let Magic = Promise.promisifyAll(new(mmmagic.Magic)(mmmagic.MAGIC_MIME_TYPE));
let request = require('request');
let path = require('path');

let listOfUrls = ['http://www.w3schools.com/html/mov_bbb.ogg', 'http://www.w3schools.com/html/mov_bbb.mp4', "http://google.com"];

// 262 bytes are required in order to truly identify the true type of a file (by checking its 'file' header)
const REQUIRED_BYTES_COUNT_FOR_TRUE_TYPE = 262;

for (let i = 0; i < listOfUrls.length; ++i) {
    let urlRequest = request(listOfUrls[i]);
    let verifiedFileName = path.basename(listOfUrls[i]);
    let outputStream = fs.createWriteStream(verifiedFileName);
    let validationStream = new ValidationStream.ValidationStream(REQUIRED_BYTES_COUNT_FOR_TRUE_TYPE, function(data) {
        return Magic.detectAsync(data).then(function(identificationResult) {
            console.log("The true type of ", listOfUrls[i], " is ", identificationResult);
            return identificationResult === "video/mp4";
        });
    });

    validationStream.on(ValidationStream.VALIDATION_FAILED_EVENT, function() {
        console.log("Validation failed for: ", listOfUrls[i]);
        fs.unlinkSync(verifiedFileName);
    })

    urlRequest.pipe(validationStream).pipe(outputStream);
}
```
The previous example uses the NPMs: request, bluebird, mmmagic.


## Tests
Execute the following command:

``` bash
    npm test
```
