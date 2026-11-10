#!/bin/bash
# aggregate bot-only matches: escapes / sacrificed / gens / stall seconds per killer.  botstats.sh <map> <matches> <minutes>
MAP=${1:-granny}; N=${2:-6}; MIN=${3:-12}
for K in granny grandpa slendrina angeline; do
  node simtest.mjs $MAP $K $N $MIN 2>/dev/null | grep '^#' | python3 -c "
import sys,json,re
esc=dead=gens=stall=n=0; t=0
for l in sys.stdin:
    r=json.loads(l.split('real:',1)[1]); n+=1; t+=r['t']; gens+=r['gens']; stall+=r.get('stallSec',0)
    for o in r['out']:
        if 'escape' in o: esc+=1
        elif 'dead' in o or 'sacr' in o or 'kill' in o: dead+=1
print('$K', 'matches',n,'escaped',esc,'/',n*4,'dead',dead,'gens/match',round(gens/max(n,1),1),'avg min',round(t/max(n,1)/60,1),'stall s',round(stall,1))
"
done
