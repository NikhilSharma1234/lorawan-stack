dockertag=ncar-da-15.rc.unr.edu/library/$1:$3
echo $dockertag
docker tag $1:$2 $dockertag
docker push $dockertag
