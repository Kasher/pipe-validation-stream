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
        })

        inputStream.pipe(validationStream).pipe(outputStream);
}

```

## Tests
Execute the following command:

``` bash
    npm test
```
