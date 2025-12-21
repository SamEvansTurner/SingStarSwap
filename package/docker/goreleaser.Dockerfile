FROM scratch
ARG TARGETPLATFORM
COPY $TARGETPLATFORM/SingStarSwap /usr/bin/SingStarSwap
EXPOSE 4000
ENTRYPOINT ["/usr/bin/SingStarSwap"]