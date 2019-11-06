const tf = require('@tensorflow/tfjs');

const tba = require('tba-api-v3client');
const fs = require('fs');

tba.ApiClient.instance.authentications.apiKey.apiKey = 'giV3xUFDeRNMB0XDoxvSaa3FrQ8IPdxGBPDdeToL1GQz4ZhwpfMn88OwVTMXX9pk';

var eventsApi = new tba.EventApi();

const asPromise = func => {
    return new Promise((resolve, reject) => {
        func((err, data) => {
            if (err) reject(err);
            resolve(data);
        });
    });
};

const flatten = arr => [].concat.apply([], arr);

const to_set = data => new Set(data);

const get_events = () => {
    var promises = [];

    for (var i = 2015; i < 2020; i++) {
        promises.push(asPromise(cb => eventsApi.getEventsByYearSimple(i, {}, cb)));
    }

    return Promise.all(promises);
};

const only_regionals_districts = events => {
    return events.filter(v => v.event_type == 0 || v.event_type == 1 || v.event_type == 2 || v.event_Type == 5);
};

const event_keys = events => events.map(v => v.key);

const all_event_awards = events => {
    var promises = [];

    for (var i = 0; i < events.length; i++) {
        console.log(events[i]);
        promises.push(asPromise(cb => eventsApi.getEventAwards(events[i], {}, cb)));
    }

    return Promise.all(promises);
};

const transpose_awards = awards => {
    return awards.map(a => {
        var recps = [];

        for (var i = 0; i < a.recipient_list.length; i++) {
            recps.push({
                'award_type': a.award_type,
                'year': a.year,
                'team_key': a.recipient_list[i].team_key,
                'event_key': a.event_key,
                'pick': i
            });
        }

        return recps;
    });
};

const write_to_file = fname => {
    return data => {
        asPromise(cb => fs.writeFile(fname, JSON.stringify(data), err => cb(err, data)));
    };
};

get_events()
    .then(flatten)
    .then(only_regionals_districts)
    .then(event_keys)
    .then(all_event_awards)
    .then(flatten)
    .then(transpose_awards)
    .then(flatten)
    .then(write_to_file('./awards.json'))
    .then(_ => console.log('Done!'))
    .catch(console.error);