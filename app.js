var allTeams = [
    "frc1024",
    "frc1076",
    "frc1189",
    "frc1305",
    "frc141",
    "frc145",
    "frc1468",
    "frc1629",
    "frc1739",
    "frc1796",
    "frc188",
    "frc2013",
    "frc2170",
    "frc237",
    "frc245",
    "frc2512",
    "frc27",
    "frc2706",
    "frc2708",
    "frc2729",
    "frc2767",
    "frc2783",
    "frc2877",
    "frc3171",
    "frc3175",
    "frc3236",
    "frc329",
    "frc33",
    "frc337",
    "frc346",
    "frc3534",
    "frc3539",
    "frc3637",
    "frc3683",
    "frc369",
    "frc3950",
    "frc401",
    "frc4027",
    "frc4308",
    "frc4327",
    "frc4362",
    "frc4466",
    "frc4481",
    "frc4539",
    "frc469",
    "frc4811",
    "frc4855",
    "frc5030",
    "frc5148",
    "frc5243",
    "frc5517",
    "frc5561",
    "frc5962",
    "frc610",
    "frc611",
    "frc614",
    "frc623",
    "frc663",
    "frc6753",
    "frc6868",
    "frc6964",
    "frc7048",
    "frc7153",
    "frc74",
    "frc747",
    "frc810",
    "frc836",
    "frc888"
];

var entrants = [{
    name : 'BNI',
    position : 0,
    picks : []
},{
    name : 'WHR1',
    position : 0,
    picks : []
},{
    name : 'BB',
    position : 0,
    picks : []
},{
    name : 'TLC',
    position : 0,
    picks : []
},{
    name : 'AB',
    position : 0,
    picks : []
},{
    name : 'ELO',
    position : 0,
    picks : []
},{
    name : 'TFP',
    position : 0,
    picks : []
},{
    name : 'TMQD',
    position : 0,
    picks : []
},{
    name : 'UL',
    position : 0,
    picks : []
},{
    name : 'AC',
    position : 0,
    picks : []
},{
    name : 'WHY',
    position : 0,
    picks : []
},{
    name : 'DPR',
    position : 0,
    picks : []
},{
    name : 'SD',
    position : 0,
    picks : []
},{
    name : 'IG',
    position : 0,
    picks : []
}];

$(document).ready(function(){
    updateRemainingTeams();
    updatePicks();
    runDraft();
});

var updateRemainingTeams = function updateRemainingTeams(){
    var template = $('#remaining_teams_template').text();
    
    trimmedTeams = _.map(allTeams, function(t){
        return Number(_.replace(t,'frc',''));
    });

    compiled = _.template(template);

    trimmedTeams.sort((a, b) => a - b);

    actualTeams = _.map(trimmedTeams, function(t){
        return getRealTeam(t);
    });

    $('.remaining_teams_list').html(compiled({teams : actualTeams}));
}

var updatePicks = function updatePicks(){
    var template = $('#picks_template').text();

    compiled = _.template(template);

    entrants = _.sortBy(entrants,[function(e){
        return e.position;
    }]);

    $('.picks_table tbody').html(compiled({entrants : entrants}));
}

var getRealTeam = function(team, allTeams){
    return _.find(window.teamStrength, function(t){ return t.team == team});
}

var runDraft = function runDraft(){
    ordering = Array.from({length: entrants.length}, () => Math.floor(Math.random() * entrants.length));
    for(i = 0; i < entrants.length; i++){
        entrants[i].position = ordering[i];
    }
    updatePicks();
    console.log(entrants);
}