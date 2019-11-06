const fs = require('fs');
const tf = require('@tensorflow/tfjs');
const brain = require('brain.js');

const NUM_EPOCHS = 250;
const BATCH_SIZE = 50;


const asPromise = func => {
    return new Promise((resolve, reject) => {
        func((err, data) => {
            if (err) reject(err);
            resolve(data);
        });
    });
};

const read_file = file => {
    return asPromise(cb => fs.readFile(file, cb));
};

const parse = data => JSON.parse(data);

const filter = data => {
    var input = [];
    var output = [];
    for (var i in data.input) {
        //if they've won any awards in the past 4 years
        pts = data.input[i][1] + data.input[i][2] + data.input[i][3] + data.output[i][0];
        if (pts > -1) { //data.output[i][0] > 0) {
            input.push(data.input[i]);
            output.push(data.output[i]);
        }
    }

    console.log(input.length);

    return {
        input: input,
        output: output
    };
};

const join = data => tf.concat([data.input, data.output], 1);

const shuffle = data => {
    var buffer = data.buffer();
    for (let i = buffer.shape[0] - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        var tmp = [buffer.get(i, 0), buffer.get(i, 1), buffer.get(i, 2), buffer.get(i, 3), buffer.get(i, 4)];
        buffer.set(buffer.get(j, 0), i, 0);
        buffer.set(buffer.get(j, 1), i, 1);
        buffer.set(buffer.get(j, 2), i, 2);
        buffer.set(buffer.get(j, 3), i, 3);
        buffer.set(buffer.get(j, 4), i, 4);

        buffer.set(tmp[0], j, 0);
        buffer.set(tmp[1], j, 1);
        buffer.set(tmp[2], j, 2);
        buffer.set(tmp[3], j, 3);
        buffer.set(tmp[4], j, 4);
    }

    return buffer.toTensor();
};

var model = () => {
    model = tf.sequential({
        layers: [
            tf.layers.dense({
                inputShape: [4],
                units: 5,
            }),
            tf.layers.dense({
                units: 5,
                activation: 'relu'
            }),
            tf.layers.dense({
                units: 1,
            })
        ]
    });



    model.summary();

    model.compile({
        optimizer: tf.train.adam(),
        loss: 'meanSquaredError'
    });
};

const input_output = data => {
    var [train_split, test_split] = tf.split(data, [4, 1], 1);

    console.log(train_split);

    var [train_input, test_input] = tf.split(train_split, [2300, 486], 0);
    var [train_output, test_output] = tf.split(test_split, [2300, 486], 0);

    return [train_input, test_input, train_output, test_output];
};

const drop = cnt => data => tf.split(data, [1000, cnt], 0)[0];

const train = async data => {
    model();

    var [train_input, test_input, train_output, test_output] = input_output(data);

    for (var i = 0; i <= 4; i++) {
        console.log(i, 'train', '[', train_input.get(i, 0), train_input.get(i, 1), train_input.get(i, 2), train_input.get(i, 3), ']', '->', train_output.get(i, 0));
    }

    let trainLogs = [];

    await model.fit(train_input, train_output, {
        batchSize: BATCH_SIZE,
        epochs: NUM_EPOCHS,
        validationSplit: 0.25,
        callbacks: {
            onEpochEnd: async (epoch, logs) => {
                trainLogs.push(logs);
                console.log(epoch, logs);
            }
        }
    });

    const result = model.evaluate(
        test_input, test_output, {
            batchSize: BATCH_SIZE
        });
    const testLoss = result.dataSync()[0];

    const trainLoss = trainLogs[trainLogs.length - 1].loss;
    const valLoss = trainLogs[trainLogs.length - 1].val_loss;

    console.log('Test Loss', testLoss);
    console.log('Train Loss', trainLoss);
    console.log('Val Loss', valLoss);

    return data;
};

read_file('test_data.json')
    .then(parse)
    //.then(filter)
    .then(join)
    .then(shuffle)
    .then(train)
    .catch(console.error);