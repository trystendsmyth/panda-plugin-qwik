import { Box, HStack, Section, VStack, type VstackProps } from '@styled/jsx'
import type { HTMLStyledProps } from '@styled/types'

export const basic = (
  <VStack gap="8" mt="4" _hover={{ bg: 'red.500' }} md={{ px: '6' }}>
    text
  </VStack>
)

export const responsive = <HStack gap={{ base: '2', md: '4' }} justify="space-between" />

export const asList = (
  <VStack as="ul" gap="2">
    <li>item</li>
  </VStack>
)

// `as` re-types the element attributes.
export const asLink = (
  <Box as="a" href="/docs" color="blue.500">
    docs
  </Box>
)

// @ts-expect-error a <div> has no `href`
export const divWithHref = <Box href="/docs" />

export const classList = <HStack class={['a', false, { b: true }]} id="row" aria-label="Row" data-state="open" />

export const cssProp = <Box css={{ p: '4', _focusVisible: { outline: '2px solid' } }} />

export const section = <Section inset="4" bg="gray.50" />

// @ts-expect-error `p` is blocklisted on Section
export const blocked = <Section p="4" />

// @ts-expect-error `justify` takes a string, not a number
export const wrongType = <VStack justify={1} />

const vstackProps: VstackProps = { gap: '4', justify: 'center', mt: '2' }
export const spread = <VStack {...vstackProps} />

export const buttonProps: HTMLStyledProps<'button'> = { type: 'submit', px: '4', disabled: true }
