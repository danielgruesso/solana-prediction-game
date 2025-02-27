import { useToast } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import axiosInstance from "../lib/axiosInstance";
/**
 * 
 * @returns price feeds from getLatestDataRound api every 60 seconds
 */
const useDataFeeds = () => {
    const [dataFeeds, setDataFeeds] = useState([]);

    const toast = useToast();

    const handleDataFeedUpdate = (round) => {
        setDataFeeds(oldDataFeeds => {
            const foundIndex = oldDataFeeds.findIndex(df => (df.feed === round.feed));
            if(foundIndex === -1) {
                oldDataFeeds.push(round);
            }else {
                oldDataFeeds[foundIndex] = round;
            }
            return oldDataFeeds
        });
    }

    const getDataFeeds = (cached) => { 
        const queryParams = new URLSearchParams({
            cached
        });

        axiosInstance.get(`/api/feed/getLatestDataRound?${queryParams}`)
        .then(response => {
            response.data.map(feed => {
                if(!('status' in feed)){
                    handleDataFeedUpdate(feed);
                }else{
                    if(feed.status === 'fulfilled'){
                        handleDataFeedUpdate(feed.value);
                    }
                }
                return feed;
            });
        })
        .catch(err => {
            const queryParams = new URLSearchParams({
                cached: true
            });
    
            axiosInstance.get(`/api/feed/getLatestDataRound?${queryParams}`)
            .then(response => {
                response.data.map(feed => {
                    if(!('status' in feed)){
                        handleDataFeedUpdate(feed);
                    }
                })
            });
        });
    }

    useEffect(() => {
        getDataFeeds(true);
        window.dataFeedInterval = setInterval(
            () => getDataFeeds(false),
            1000 * 60 * 1 //  1000 ms/s * 60 s/min * min = # ms
        )
        return () => {
            clearInterval(window.dataFeedInterval)
        }
        // eslint-disable-next-line
    }, []);
    return dataFeeds;
};

export default useDataFeeds;
