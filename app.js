var allTeams = null;
var remainingTeams = null;

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

var eventCode = null;

$(document).ready(function(){
    updatePicks();

    $('#pick_field').keypress(function(e) {
        if(e.which == 13) {
            if(eventCode != null){
                runDraft($('#pick_field').val());
            } else {
                eventCode = $('#pick_field').val();
                pollDataForEvent(eventCode);
                updateRemainingTeams();

                startDraft();
            }
            $('#pick_field').val(null);
        }
    });
});

var pollDataForEvent = function pollDataForEvent(eventCode){
    url = "https://www.thebluealliance.com/api/v3/event/" + eventCode + "/teams/keys";

    $.ajaxSetup({
        headers: { 'X-TBA-Auth-Key': window.TBA_KEY }
    });

    $.ajax({ 'url' : url, async: false }).done(function(data){
        allTeams = data;
        allTeams = _.map(allTeams, function(t){
            return Number(_.replace(t,'frc',''));
        });
        allTeams.sort((a, b) => a - b);
        remainingTeams = allTeams.slice();
    });
}

var updateRemainingTeams = function updateRemainingTeams(){
    var template = $('#remaining_teams_template').text();

    compiled = _.template(template);

    actualTeams = _.map(remainingTeams, function(t){
        retVal = getRealTeam(t);
        return retVal;
    });

    $('.remaining_teams_list').html(compiled({teams : actualTeams}));
}

var updatePicks = function updatePicks(){
    var template = $('#picks_template').text();
    compiled = _.template(template);

    entrants = _.sortBy(entrants,[function(e){
        return e.score;
    },function(e){
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
    ret = _.find(window.teamStrength, function(t){ return t.team == team});
    if(!ret){
        ret = { 'team' : team, elo : 1450 }
    }
    return ret;
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

    if(!_.includes(remainingTeams, Number(t))){
        alert("team not available!");
        return;
    }
    teamPicked = getRealTeam(t);
    entrants[OTC].picks.push(teamPicked);
    _.pull(remainingTeams, Number(t));
    if((OTC == entrants.length - 1 && round != 2) || (OTC == 0 && round == 2)){
        round++;
    } else if(round == 2){
        OTC--;
    } else {
        OTC++;
    }
    updateRemainingTeams();
    updatePicks();
    updateBalloon();
}

var computeScores = function computeScores(){
    url = "https://www.thebluealliance.com/api/v3/event/" + eventCode + "/district_points";
    var robotPointsMap;
    $.ajax({ 'url' : url, async: false }).done(function(data){
        robotPointsMap = data.points;
    });

    url = "https://www.thebluealliance.com/api/v3/event/" + eventCode + "/awards";
    var awards;
    $.ajax({ 'url' : url, async: false }).done(function(data){
        awards = data;
    });

    entrants.forEach(function(entrant){
        var score = 0;

        entrant.picks.forEach(function(team){
            //// just use TBA points dawg
            // var innerTerm = ((numberOfTeams - (2 * rank.rank) + 2) / (alpha * numberOfTeams));
            // console.log(innerTerm);
            // var firstTerm = erfinv(innerTerm);
            // console.log(firstTerm);
            // var secondTerm = (10/erfinv(1/alpha));
            // console.log(secondTerm);
            // var result = (firstTerm * secondTerm) + 12;
            // console.log(result);

            tbaData = robotPointsMap["frc" + team.team];

            robotPoints = tbaData.alliance_points;
            robotPoints += tbaData.elim_points;
            robotPoints += tbaData.qual_points;

            score += robotPoints;

            awardsForTeam = _.filter(awards,function(a){
                return !!_.find(a.recipient_list,function(t){
                    return Number(_.replace(t.team_key,'frc','')) == team.team;
                });
            });

            var awardPoints = 0;

            awardsForTeam.forEach(function(a){
                points = _.find(window.awardPoints, function(ap){
                    return ap.awardType == a.award_type;
                });

                awardPoints += points.points;
            });

            score += awardPoints;

        });
        entrant.score = score;
    });



    updatePicks();
}



//https://stackoverflow.com/a/12556710
function erfinv(x){
    var z;
    var a  = 0.147;                                                   
    var the_sign_of_x;
    if(0==x) {
        the_sign_of_x = 0;
    } else if(x>0){
        the_sign_of_x = 1;
    } else {
        the_sign_of_x = -1;
    }

    if(0 != x) {
        var ln_1minus_x_sqrd = Math.log(1-x*x);
        var ln_1minusxx_by_a = ln_1minus_x_sqrd / a;
        var ln_1minusxx_by_2 = ln_1minus_x_sqrd / 2;
        var ln_etc_by2_plus2 = ln_1minusxx_by_2 + (2/(Math.PI * a));
        var first_sqrt = Math.sqrt((ln_etc_by2_plus2*ln_etc_by2_plus2)-ln_1minusxx_by_a);
        var second_sqrt = Math.sqrt(first_sqrt - ln_etc_by2_plus2);
        z = second_sqrt * the_sign_of_x;
    } else { // x is zero
        z = 0;
    }

    return z;
}