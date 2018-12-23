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
    picks : [],
    score : null
},{
    name : 'WHR1',
    position : 0,
    picks : [],
    score : null
},{
    name : 'BB',
    position : 0,
    picks : [],
    score : null
},{
    name : 'TLC',
    position : 0,
    picks : [],
    score : null
},{
    name : 'AB',
    position : 0,
    picks : [],
    score : null
},{
    name : 'ELO',
    position : 0,
    picks : [],
    score : null
},{
    name : 'TFP',
    position : 0,
    picks : [],
    score : null
},{
    name : 'TMQD',
    position : 0,
    picks : [],
    score : null
},{
    name : 'UL',
    position : 0,
    picks : [],
    score : null
},{
    name : 'AC',
    position : 0,
    picks : [],
    score : null
},{
    name : 'WHY',
    position : 0,
    picks : [],
    score : null
},{
    name : 'DPR',
    position : 0,
    picks : [],
    score : null
},{
    name : 'SD',
    position : 0,
    picks : [],
    score : null
},{
    name : 'IG',
    position : 0,
    picks : [],
    score : null
}];

$(document).ready(function(){
    allTeams = _.map(allTeams, function(t){
        return Number(_.replace(t,'frc',''));
    });

    updateRemainingTeams();
    updatePicks();
    startDraft();

    $('#pick_field').keypress(function(e) {
        if(e.which == 13) {
            runDraft($('#pick_field').val());
            $('#pick_field').val(null);
        }
    });
});

var updateRemainingTeams = function updateRemainingTeams(){
    var template = $('#remaining_teams_template').text();

    compiled = _.template(template);

    allTeams.sort((a, b) => a - b);

    actualTeams = _.map(allTeams, function(t){
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

var updateBalloon = function(e){
    var template = $('#balloon_template').text();
    compiled = _.template(template);
    $('.message_balloon').html(compiled({entrant : entrants[OTC]}));
}

var getRealTeam = function(team, allTeams){
    return _.find(window.teamStrength, function(t){ return t.team == team});
}

var startDraft = function startDraft(){
    ordering = Array.from({length: entrants.length}, () => Math.floor(Math.random() * entrants.length));
    for(i = 0; i < entrants.length; i++){
        entrants[i].position = ordering[i];
    }
    updatePicks();
    OTC = 0;
    updateBalloon();
}

var OTC = 0;
var round = 1;

var runDraft = function runDraft(t){
    if(round == 4){
        alert("draft complete!");
        computeScores();
        return;
    }

    if(!_.includes(allTeams, Number(t))){
        alert("team not available!");
        return;
    }
    teamPicked = getRealTeam(t);
    entrants[OTC].picks.push(teamPicked);
    _.pull(allTeams, Number(t));
    if(OTC == entrants.length - 1){
        round++;
        OTC = 0;
    } else {
        OTC++;
    }
    updateRemainingTeams();
    updatePicks();
    updateBalloon();
}

var computeScores = function computeScores(){

}