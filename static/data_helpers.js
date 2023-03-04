/*
    Remove patterns outside min and max range
*/
const dataReducer = (array, min, max) => {
    array.sort((a, b) => b.f1.length - a.f1.length)
    while (array[0].f1.length > max) {
        array.shift();
    }
    while (array[array.length - 1].f1.length < min) {
        array.pop();
    }
    return array;
}

/*
    Shuffle data elements
*/
const shuffle = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

/*
    Group array elements by property
*/
const groupBy = (objectArray, property) => {
    return objectArray.reduce((acc, obj) => {
        const key = obj[property];
        const curGroup = acc[key] ?? [];
        return { ...acc, [key]: [...curGroup, obj] };
    }, {});
}

const testingAcc = (testingRes, expectedRes) => {
    function indexOfMax(arr) {
        if (arr.length === 0) {
            return -1;
        }
        let max = arr[0];
        let maxIndex = 0;
        for (let i = 1; i < arr.length; i++) {
            if (arr[i] > max) {
                maxIndex = i;
                max = arr[i];
            }
        }
        return maxIndex;
    }

    let correctPredictions = 0;

    for (let i = 0; i < testingRes.length; i++) {
        // Validate testing data for invalid characters before making comparison
        for (let j = 0; j < testingRes[i].length; j++) {
            if (isNaN(testingRes[i][j])) {
                console.log("Error: Returned testing results contain invalid data 'NaN'.");
                return;
            }
        }

        if (indexOfMax(testingRes[i]) == expectedRes[i].indexOf(1)) {
            correctPredictions += 1;
        }
    }
    return (correctPredictions / testingRes.length);
}

module.exports = {
    dataReducer,
    shuffle,
    groupBy,
    testingAcc,
};