
const fs = require('fs');

const points = {
    /*  CHA */
    0: 60,
    /*  WIN */
    1: 0,
    /*  FIN */
    2: 0,
    /*  WFF */
    3: 10,
    /*  DNL */
    4: 5,
    /*  VOY */
    5: 0,
    /*  EGI */
    9: 45,
    /*  RAS */
    10: 25,
    /*  GRP */
    11: 5,
    /*  JUG */
    13: 5,
    /*  HRS */
    14: 5,
    /*  RKI */
    15: 15,
    /*  IND */
    16: 20,
    /*  QAL */
    17: 20,
    /*  SFT */
    18: 5,
    /*  CRE */
    20: 20,
    /*  EGE */
    21: 20,
    /*  KPC */
    22: 5,
    /*  IMG */
    27: 5,
    /*  IVC */
    29: 20,
    /*  SPI */
    30: 5,
    /*  WLD */
    68: 0,
    /*  ATO */
    71: 20
};

var input_data = [];

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

const filter_no_team = data => data.filter(d => d.team_key != null);

var award_types = data => {
    award_types = new Set(data.map(d => d.award_type));
    return data;
};

const score = data => {
    data.forEach(v => {
        v.score = points[v.award_type];
        return v;
    });

    return data;
};

const group_by_team = data =>
    data.reduce((acc, curr) => {
        if (!(curr.team_key in acc)) acc[curr.team_key] = [];

        acc[curr.team_key].push(curr);
        return acc;
    }, {});

const group_by_year = data => {
    var grouped = {};
    for (var team in data) {
        grouped[team] = data[team].reduce((acc, curr) => {
            if (!(curr.year in acc)) acc[curr.year] = [];

            acc[curr.year].push(curr);
            return acc;
        }, {});
    }

    input_data = grouped;
    return grouped;
};

var elos = data => {
    elos = data;
    return data;
};

var awards = data => {
    awards = data;
    return data;
};

const reshape = data => {
    obj = {};

    data.forEach(datum => {
        key = 'frc' + datum.team;
        if (!(key in obj)) {
            obj[key] = {};
            obj[key].team_key = key;
        }
        obj[key][datum.year] = datum.elo;
    });

    return obj;
};

const to_tensors = data => {
    var tensors = [];

    for (var team in data) {
        var tensor = [];
        for (var i = 2015; i <= 2019; i++) {
            var year = default_tensor();
            year[0] = try_elo(team, i + 1);
            if (i in data[team]) {
                year_to_tensor(year, data[team][i]);
            }
            tensor.push(year);
        }
        tensors.push(tensor);
    }

    return tensors;
};

const year_to_tensor = (tensor, data) => {
    for (var ix in data) {
        var award = data[ix];
        if (award.award_type == 0) tensor[1] += 60;
        else if (award.award_type == 1) {
            if (award.pick < 2) tensor[2] += 30;
            else tensor[3] += 30;
        } else if (award.award_type == 2) {
            if (award.pick < 2) tensor[4] += 20;
            else tensor[5] += 20;
        } else if (award.award_type == 3) tensor[6] += 10;
        else if (award.award_type == 4) tensor[7] += 5;
        else if (award.award_type == 5) tensor[8] += 0;
        else if (award.award_type == 9) tensor[9] += 45;
        else if (award.award_type == 10) tensor[10] += 25;
        else if (award.award_type == 11) tensor[11] += 5;
        else if (award.award_type == 13) tensor[12] += 5;
        else if (award.award_type == 14) tensor[13] += 5;
        else if (award.award_type == 15) tensor[14] += 15;
        else if (award.award_type == 16) tensor[15] += 20;
        else if (award.award_type == 17) tensor[16] += 20;
        else if (award.award_type == 18) tensor[17] += 5;
        else if (award.award_type == 20) tensor[18] += 20;
        else if (award.award_type == 21) tensor[19] += 20;
        else if (award.award_type == 22) tensor[20] += 5;
        else if (award.award_type == 27) tensor[21] += 5;
        else if (award.award_type == 29) tensor[22] += 20;
        else if (award.award_type == 30) tensor[23] += 5;
        else if (award.award_type == 68) tensor[24] += 0;
        else if (award.award_type == 71) tensor[25] += 20;
    }
};

const default_tensor = () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const try_elo = (team, year) => {
    try {
        return elos[team][year];
    } catch (err) {
        return 1500; // Average ELO
    }
};

const write_to_file = fname => {
    return data => {
        asPromise(cb => fs.writeFile(fname, JSON.stringify(data), err => cb(err, data)));
    };
};

const load_info = () => {
    var promises = [
        read_file('elos.json')
            .then(parse)
            .then(reshape)
            .then(elos),
        read_file('awards.json')
            .then(parse)
    ];
    return Promise.all(promises);
};

const select = ix => data => data[ix];

const reduce_input = data => {
    return [
        data[0],
        /*data[2] + data[3] + */
        data[4] + data[5] + data[13] + data[15] + data[16] + data[18] + data[19] + data[22] + data[25],
        data[1] + data[6] + data[7] + data[9] + data[10] + data[14] + data[20],
        data[8] + data[11] + data[12] + data[17] + data[21] + data[23]
    ];
};

const collect_tensor = data => {
    var train_input = data[2];
    var real_input = data[3];
    var train_output =
        data[3][1] +
        data[3][6] +
        data[3][7] +
        data[3][9] +
        data[3][11] +
        data[3][12] +
        data[3][15] +
        data[3][16] +
        data[3][17] +
        data[3][18] +
        data[3][19] +
        data[3][20] +
        data[3][21] +
        data[3][22] +
        data[3][23] +
        data[3][25];

    for (var item in train_input) {
        if (item > 0) {
            train_input[item] *= 0.7;
            real_input[item] *= 0.7;
        }
    }

    //real pass
    var year, item;
    for (year = 1; year <= 4; year++) {
        for (item in data[year]) {
            if (item > 0) {
                if (year == 1) real_input[item] += data[year][item] * 0.09;
                else real_input[item] += data[year][item] * 0.21;
            }
        }
    }

    //training pass
    for (year = 0; year < 2; year++) {
        for (item in data[year]) {
            if (item > 0) {
                if (year == 0) real_input[item] += data[year][item] * 0.09;
                else real_input[item] += data[year][item] * 0.21;
            }
        }
    }

    return [reduce_input(train_input), [train_output], reduce_input(real_input)];
};

const reduce = data => {
    var test_input = [];
    var test_output = [];
    var real_input = [];

    console.log(data[0]);
    for (var x in data) {
        var [test_item, test_res, real_item] = collect_tensor(data[x]);
        test_input.push(test_item);
        test_output.push(test_res);
        real_input.push(real_item);
    }

    return {
        test: {
            input: test_input,
            output: test_output,
        },
        real: {
            input: real_input
        }
    };
};

const scale = data => {
    var min = [9999999, 0, 0, 0, 0];
    var max = [-9999999, 0, 0, 0, 0];

    var tinput, rinput, toutput;

    for (var i = 0; i < data.test.input.length; i++) {
        tinput = data.test.input[i];
        rinput = data.real.input[i];
        toutput = data.test.output[i];

        if (tinput[0] < min[0]) min[0] = tinput[0];
        if (tinput[1] < min[1]) min[1] = tinput[1];
        if (tinput[2] < min[2]) min[2] = tinput[2];
        if (tinput[3] < min[3]) min[3] = tinput[3];

        if (rinput[0] < min[0]) min[0] = rinput[0];
        if (rinput[1] < min[1]) min[1] = rinput[1];
        if (rinput[2] < min[2]) min[2] = rinput[2];
        if (rinput[3] < min[3]) min[3] = rinput[3];

        if (toutput[4] < min[4]) min[4] = toutput[0];

        if (tinput[0] > max[0]) max[0] = tinput[0];
        if (tinput[1] > max[1]) max[1] = tinput[1];
        if (tinput[2] > max[2]) max[2] = tinput[2];
        if (tinput[3] > max[3]) max[3] = tinput[3];

        if (rinput[0] > max[0]) max[0] = rinput[0];
        if (rinput[1] > max[1]) max[1] = rinput[1];
        if (rinput[2] > max[2]) max[2] = rinput[2];
        if (rinput[3] > max[3]) max[3] = rinput[3];

        if (toutput[4] > max[4]) max[4] = toutput[0];
    }

    for (i = 0; i < data.test.input.length; i++) {
        tinput = data.test.input[i];
        rinput = data.real.input[i];
        toutput = data.test.output[i];

        tinput[0] = (tinput[0] - min[0]) / (max[0] - min[0]);
        tinput[1] = (tinput[1] - min[1]) / (max[1] - min[1]);
        tinput[2] = (tinput[2] - min[2]) / (max[2] - min[2]);
        tinput[3] = (tinput[3] - min[3]) / (max[3] - min[3]);

        rinput[0] = (rinput[0] - min[0]) / (max[0] - min[0]);
        rinput[1] = (rinput[1] - min[1]) / (max[1] - min[1]);
        rinput[2] = (rinput[2] - min[2]) / (max[2] - min[2]);
        rinput[3] = (rinput[3] - min[3]) / (max[3] - min[3]);

        toutput[0] = (toutput[0] - min[4]) / (max[4] - min[4]);
    }

    return data;
};

const zscore = data => {
    var avg = [0, 0, 0, 0, 0];
    var stddev = [0, 0, 0, 0, 0];

    for (var i = 0; i < data.test.input.length; i++) {
        avg[0] += data.test.input[i][0];
        avg[1] += data.test.input[i][1];
        avg[2] += data.test.input[i][2];
        avg[3] += data.test.input[i][3];
        avg[4] += data.test.output[i][0];
    }

    avg[0] /= data.test.input.length;
    avg[1] /= data.test.input.length;
    avg[2] /= data.test.input.length;
    avg[3] /= data.test.input.length;
    avg[4] /= data.test.input.length;

    for (i = 0; i < data.test.input.length; i++) {
        stddev[0] += Math.pow(data.test.input[i][0] - avg[0], 2);
        stddev[1] += Math.pow(data.test.input[i][1] - avg[1], 2);
        stddev[2] += Math.pow(data.test.input[i][2] - avg[2], 2);
        stddev[3] += Math.pow(data.test.input[i][3] - avg[3], 2);
        stddev[4] += Math.pow(data.test.output[i][0] - avg[4], 2);
    }

    stddev[0] = Math.sqrt(stddev[0] / (data.test.input.length - 1));
    stddev[1] = Math.sqrt(stddev[1] / (data.test.input.length - 1));
    stddev[2] = Math.sqrt(stddev[2] / (data.test.input.length - 1));
    stddev[3] = Math.sqrt(stddev[3] / (data.test.input.length - 1));
    stddev[4] = Math.sqrt(stddev[4] / (data.test.input.length - 1));

    for (i = 0; i < data.test.input.length; i++) {
        var tinput = data.test.input[i];
        var rinput = data.real.input[i];
        var toutput = data.test.output[i];

        tinput[0] = (tinput[0] - avg[0]) / stddev[0];
        tinput[1] = (tinput[1] - avg[1]) / stddev[1];
        tinput[2] = (tinput[2] - avg[2]) / stddev[2];
        tinput[3] = (tinput[3] - avg[3]) / stddev[3];

        rinput[0] = (rinput[0] - avg[0]) / stddev[0];
        rinput[1] = (rinput[1] - avg[1]) / stddev[1];
        rinput[2] = (rinput[2] - avg[2]) / stddev[2];
        rinput[3] = (rinput[3] - avg[3]) / stddev[3];

        toutput[0] = (toutput[0] - avg[4]) / stddev[4];
    }

    return data;
};

const deanonymize = data => {
    var teams = Object.keys(input_data);
    var teams_2019 = {};
    for (var team in teams) {
        teams_2019[teams[team]] = data.real.input[team];
    }

    console.log(input_data['frc27']);
    console.log(teams_2019['frc27']);

    data.real.input = teams_2019;
    return data;
    //zip data with input_data that has team_key and make new object for data.real.input
};

const write_files = async data => {

    await write_to_file("test_data.json")(data.test);
    await write_to_file("real_data.json")(data.real);

    return data;
};

load_info()
    .then(select(1))
    .then(filter_no_team)
    .then(award_types)
    //.then(score)
    .then(group_by_team)
    .then(group_by_year)
    .then(to_tensors)
    //    .then(stats)
    .then(reduce)
    .then(scale)
    .then(deanonymize)
    .then(write_files)
    .then(() => console.log("Done!"))
    .catch(err => console.error('ERR', err));