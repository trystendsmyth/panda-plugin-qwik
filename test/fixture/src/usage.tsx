// Shared JSX usage. Both the React and the Qwik configs extract from this file;
// their generated CSS must be byte-identical.
import { Box, Center, Flex, Grid, GridItem, HStack, Stack, VisuallyHidden, VStack, Wrap } from '@styled/jsx'

export const Usage = () => (
  <VStack gap="8" mt="4" bg="gray.100" _hover={{ bg: 'red.500' }} md={{ px: '6' }}>
    <HStack gap="2" justify="space-between" color="blue.700">
      <Box as="span" fontWeight="semibold" css={{ letterSpacing: 'wide' }}>
        label
      </Box>
      <VisuallyHidden>hidden</VisuallyHidden>
    </HStack>
    <Stack direction={{ base: 'column', lg: 'row' }} align="center" p="3" />
    <Flex wrap="wrap" grow={1} borderWidth="1px" _focusVisible={{ outline: '2px solid' }} />
    <Grid columns={3} gap="4">
      <GridItem colSpan={2} rounded="md" />
    </Grid>
    <Wrap gap="1" />
    <Center w="10" h="10" htmlWidth="40" />
  </VStack>
)
