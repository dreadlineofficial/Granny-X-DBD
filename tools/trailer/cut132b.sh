#!/bin/bash
# assemble the 1.3.2 trailer v2 (Freddy first, play as each killer, then the small things): ./cut132b.sh [out.mp4]
set -e
F=/tmp/claude-0/tr/f; F2=/tmp/claude-0/tr/f2; S=/tmp/claude-0/tr/seg; O=/tmp/claude-0/tr/ov2; G=/tmp/claude-0/tr/g; W=/tmp/claude-0/tr/clips2; mkdir -p $W
GRADE="scale=1920:1080:flags=lanczos,unsharp=5:5:0.8:5:5:0.0,eq=contrast=1.06:brightness=0.03:saturation=0.92:gamma=1.18,vignette=PI/5.5,noise=alls=6:allf=t+u"
ENC="-c:v libx264 -preset medium -crf 17 -pix_fmt yuv420p -r 30"
# clip <name> <dir/prefix> <start> <frames> <slow> <dur> [overlay.png]
clip() {
  local name=$1 src=$2 start=$3 n=$4 slow=$5 dur=$6 ov=$7
  local vf="setpts=${slow}*(PTS-STARTPTS),framerate=fps=30,trim=duration=${dur},${GRADE}"
  if [ -n "$ov" ]; then
    ffmpeg -v error -y -framerate 30 -start_number $start -i ${src}_%04d.jpg -loop 1 -framerate 30 -i $ov -frames:v $(python3 -c "print(round($dur*30))") \
      -filter_complex "[0:v]trim=end_frame=$n,${vf}[v];[1:v]format=rgba,fade=in:st=0.25:d=0.35:alpha=1,fade=out:st=$(python3 -c "print($dur-0.5)"):d=0.35:alpha=1[t];[v][t]overlay=shortest=0" $ENC $W/$name.mp4
  else
    ffmpeg -v error -y -framerate 30 -start_number $start -i ${src}_%04d.jpg -frames:v $(python3 -c "print(round($dur*30))") -vf "trim=end_frame=$n,${vf}" $ENC $W/$name.mp4
  fi
}
# start frames can be overridden: G2=<first frame of the chase> etc.
clip 01 $F2/a1 0 105 1 3.5 $O/v1.png
clip 02 $G/g1 ${G1:-0} 105 1 3.5 $O/v2.png
clip 03 $G/g3 ${G3:-0} 90 1.17 3.5 $O/v3.png
clip 04 $G/g2 ${G2:-70} 50 1.5 2.5
clip 05 $G/p_granny ${P1:-0} 75 1 2.5 $O/pg.png
clip 06 $G/p_grandpa ${P2:-0} 75 1 2.5 $O/pp.png
clip 07 $G/p_slendrina ${P3:-0} 75 1 2.5 $O/ps.png
clip 08 $G/p_angeline ${P4:-0} 75 1 2.5 $O/pa.png
ffmpeg -v error -y -framerate 30 -i $S/w1_%04d.jpg -frames:v 105 $ENC $W/09.mp4
ffmpeg -v error -y -framerate 30 -i $S/w2_%04d.jpg -frames:v 105 $ENC $W/10.mp4
clip 11 $F2/a3 0 60 1 2.0 $O/sb.png
ffmpeg -v error -y -loop 1 -framerate 30 -i $O/title.png -frames:v 210 -vf "scale=3840:-1,zoompan=z='1.0+0.0004*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,fade=in:st=0:d=0.25,fade=out:st=6.0:d=1.0,noise=alls=4:allf=t+u" $ENC $W/12.mp4
ls $W/[0-9]*.mp4 | sed 's/^/file /' > $W/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $W/list.txt -c copy $W/video.mp4
OUTF=${1:-/tmp/claude-0/tr/GrannyxDBD-1.3.2-Trailer.mp4}
ffmpeg -v error -y -i $W/video.mp4 -i /tmp/claude-0/tr/audio/score132b.wav -vf "fade=in:st=0:d=0.5" -af "afade=in:st=0:d=0.3" $ENC -c:a aac -b:a 192k -shortest -movflags +faststart $OUTF
ffprobe -v error -show_entries format=duration -of csv=p=0 $OUTF
