FROM alpine:3
ARG TARGETPLATFORM
COPY $TARGETPLATFORM/SingStarSwap /bin/SingStarSwap
EXPOSE 4000
USER nobody:nobody
ENTRYPOINT ["/bin/SingStarSwap"]