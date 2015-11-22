# Language Modeling 
It is used to analyze what people are thinking about on certain topics. It analyzes what people are tweeting about on that topic and does a real-time predictive analysis.
The model takes a keyword and then uses Haven on Demand's Find Related Concepts API to identify the entities used in the Twitter search. It then streams Tweets to find all the related concepts to the entity and does sentiment analysis using HavenOnDemand Sentiment Analysis API and finds the aggregate sentiment of the tweet on a scale to 0-1.  
