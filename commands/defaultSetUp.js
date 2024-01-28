const methods = require("../methods/socketMethods")

console.log("Running bar set up")
methods.getBars(false, 'default').then((res) => {
    console.clear()
    console.log("Default Bar Json complete")
}).catch((err) => console.log(err))
