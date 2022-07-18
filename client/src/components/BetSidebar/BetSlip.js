import { Flex, FormControl, FormErrorMessage, HStack, Image, InputGroup, InputRightAddon, NumberInput, NumberInputField, Text, VStack } from "@chakra-ui/react";
import { useContext, useState } from "react";
import emptyBetSlip from '../../assets/bets/empty-betslip.svg'
import { BetDataContext } from "../../contexts/BetDataProvider";
import CreateBetButton from "../CreateBetButton";
import { CloseIcon } from "@chakra-ui/icons";
import { UserDataContext } from "../../contexts/UserDataProvider";
import { roundOff } from "../../helpers/sol_helpers";
import { DIVISOR } from "../../lib/constants";
import placeholder from "../../assets/logos/placeholder.png";

const BetSlip = () => {

    const { betSlip, setBetSlip } = useContext(BetDataContext);
    const { balances, address } = useContext(UserDataContext);

    const [ amount, setAmount ] = useState(0);

    if(!betSlip) {
        return (
            <VStack>
                <Image src={emptyBetSlip} height="64px" alt="empty bet slip" my="10px" />
                <Text fontWeight={700} color="gray.200">
                    Betslip is empty
                </Text>
                <Text color="gray.500">
                    To add a bet to your betslip, please select a prediction from the list.
                </Text>
            </VStack>
        )
    }

    const { 
        predictionData,
        firstCurrency,
        secondCurrency,
        logoImage,
        ROI
    } = betSlip;
    const { id, attributes } = predictionData;
    const { pair, prediction, predictionDeadline, expiryTime, status } = attributes;

    const removeBet = () => {
        setBetSlip(null);
    }

    const isError = amount >= balances.nativeBalance?.solana

    return (
        <form w="100%">
            <VStack
                gap="16px"
                w="100%"
                alignItems="stretch"
            >   
                <VStack
                    rounded="md"
                    bg="whiteAlpha.100"
                    alignItems="flex-start"
                    p="12px"
                >
                    <HStack
                        borderRadius="6px"
                        alignItems="center"
                        justify="space-between"
                        width="100%"
                    >
                        <HStack>
                            <Image
                                borderRadius='full'
                                boxSize='24px'
                                src={logoImage}
                                fallbackSrc={placeholder}
                                alt={pair}
                            />
                            <Text fontWeight={600} fontSize="sm" color="gray.200">
                                {pair}
                            </Text>
                        </HStack>
                        <Flex
                            alignSelf="flex-start" 
                            width="24px"
                            height="24px"
                            borderRadius="6px"
                            bg="whiteAlpha.50"
                            justify="center"
                            alignItems="center"
                            onClick={removeBet}
                        >   
                            <CloseIcon 
                                w="9px" 
                                h="9px" 
                                color="gray.500"
                            />
                        </Flex>
                    </HStack>
                    <Text textAlign="left">
                        {firstCurrency} will settle at {roundOff((prediction / DIVISOR), 3)} {secondCurrency} at {new Date(expiryTime).toLocaleString()}
                    </Text>
                    <HStack textAlign="left">
                        <Text fontWeight={500} fontSize="xs" color="gray.500">
                            Prediction ROI
                        </Text>
                        <Text fontWeight={700} fontSize="xs" color="blue.200">
                            {ROI}x
                        </Text>
                    </HStack>
                </VStack>
                <VStack>
                    <FormControl isRequired>
                        <InputGroup 
                            size='sm' 
                            rounded="md"
                        >
                            <NumberInput 
                                max={10}
                                min={0.1} 
                                defaultValue={1} 
                                precision={4}
                                placeholder="Bet Amount" 
                                rounded="md" 
                                border="1px solid" 
                                borderColor="whiteAlpha.50"
                                borderRight="0px solid transparent"
                                borderTopRightRadius={0}
                                borderBottomRightRadius={0}
                                flexGrow={1}
                                isInvalid={isError}
                                onChange={value => setAmount(Number(value))}
                            >
                                <NumberInputField id='amount' />
                            </NumberInput>
                            <InputRightAddon 
                                bg="whiteAlpha.200" 
                                children='SOL'
                                rounded="md" 
                                border="1px solid" 
                                borderColor="whiteAlpha.50"
                                height="initial"
                            />
                        </InputGroup>
                    </FormControl>
                    {isError && (
                        <Text as="span" mt="0px!important" fontWeight={500} fontSize="xs" color="red.500" alignSelf="flex-start">
                            Insufficient balance
                        </Text>
                    )}
                </VStack>
                <HStack
                    justify="space-between"
                >
                    <Text fontSize="14px" fontWeight={500} color="gray.400">
                        Balance:
                    </Text>
                    <Text fontSize="14px" fontWeight={700} color="whiteAlpha.800">
                        {roundOff(balances.nativeBalance?.solana, 3)} SOL
                    </Text>
                </HStack>
                <HStack
                    justify="space-between"
                >
                    <Text fontSize="14px" fontWeight={500} color="gray.400">
                        Possible win:
                    </Text>
                    <Text fontSize="14px" fontWeight={700} color="green.200">
                        {amount * ROI} SOL
                    </Text>
                </HStack>
                <CreateBetButton
                    width="100%"
                    rounded="md"
                    color="gray.800"
                    bg="blue.200"
                    type="submit"
                    disabled={!status && predictionDeadline > Date.now()}
                    predictionId={id}
                    amount={amount}
                    address={address}
                    setBetSlip={setBetSlip}
                />
            </VStack>
        </form>
    )
}

export default BetSlip;