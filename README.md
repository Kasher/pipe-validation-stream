# validation-stream
Easily validate streamed data in NodeJs

# Introduction
Ever needed to pipe data from one stream to another only if some validation passes? If so - this is the package for you. 
With this package you can create a validation-stream, and validate the streamed data while piping it from one stream to another.

# Installation
Install with `npm`:

``` bash
    npm install validation-stream
```

Examples
--------

Filter all files that start with the text "validation" (in order to execute this test, change listOfFiles to point to real files):

``` javascript

let ValidationStream = require('validation-stream');
let fs = require('fs');

let listOfFiles = ['a.txt', 'b.mp4', 'c.sh'];

for (let i = 0; i < listOfFiles.length; ++i) {
        let inputStream = fs.createReadStream(listOfFiles[i]);
        let outputStream = fs.createWriteStream(listOfFiles[i] + ".varified");
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
let ValidationStream = require('validation-stream');
let fs = require('fs');
let mmmagic = require('mmmagic');
let Promise = require('bluebird');
let Magic = Promise.promisifyAll(new(mmmagic.Magic)(mmmagic.MAGIC_MIME_TYPE));
let request = require('request');
let path = require('path');

let listOfUrls = ['http://www.w3schools.com/html/mov_bbb.ogg', 'http://www.w3schools.com/html/mov_bbb.mp4', "http://google.com"];

for (let i = 0; i < listOfUrls.length; ++i) {
    let urlRequest = request(listOfUrls[i]);
    let verifiedFileName = path.basename(listOfUrls[i]);
    let outputStream = fs.createWriteStream(verifiedFileName);
    let validationStream = new ValidationStream.ValidationStream(262, function(data) {
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
