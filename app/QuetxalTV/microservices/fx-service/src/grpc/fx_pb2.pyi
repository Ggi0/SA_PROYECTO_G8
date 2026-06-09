from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class ExchangeRateRequest(_message.Message):
    __slots__ = ("target_currency", "requested_by")
    TARGET_CURRENCY_FIELD_NUMBER: _ClassVar[int]
    REQUESTED_BY_FIELD_NUMBER: _ClassVar[int]
    target_currency: str
    requested_by: str
    def __init__(self, target_currency: _Optional[str] = ..., requested_by: _Optional[str] = ...) -> None: ...

class AllRatesRequest(_message.Message):
    __slots__ = ("requested_by",)
    REQUESTED_BY_FIELD_NUMBER: _ClassVar[int]
    requested_by: str
    def __init__(self, requested_by: _Optional[str] = ...) -> None: ...

class ConvertAmountRequest(_message.Message):
    __slots__ = ("amount", "target_currency", "requested_by")
    AMOUNT_FIELD_NUMBER: _ClassVar[int]
    TARGET_CURRENCY_FIELD_NUMBER: _ClassVar[int]
    REQUESTED_BY_FIELD_NUMBER: _ClassVar[int]
    amount: float
    target_currency: str
    requested_by: str
    def __init__(self, amount: _Optional[float] = ..., target_currency: _Optional[str] = ..., requested_by: _Optional[str] = ...) -> None: ...

class ExchangeRateResponse(_message.Message):
    __slots__ = ("currency_code", "currency_name", "symbol", "rate", "source", "valid_at", "success", "error_message")
    CURRENCY_CODE_FIELD_NUMBER: _ClassVar[int]
    CURRENCY_NAME_FIELD_NUMBER: _ClassVar[int]
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    RATE_FIELD_NUMBER: _ClassVar[int]
    SOURCE_FIELD_NUMBER: _ClassVar[int]
    VALID_AT_FIELD_NUMBER: _ClassVar[int]
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    ERROR_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    currency_code: str
    currency_name: str
    symbol: str
    rate: float
    source: str
    valid_at: str
    success: bool
    error_message: str
    def __init__(self, currency_code: _Optional[str] = ..., currency_name: _Optional[str] = ..., symbol: _Optional[str] = ..., rate: _Optional[float] = ..., source: _Optional[str] = ..., valid_at: _Optional[str] = ..., success: _Optional[bool] = ..., error_message: _Optional[str] = ...) -> None: ...

class RateItem(_message.Message):
    __slots__ = ("currency_code", "currency_name", "symbol", "rate")
    CURRENCY_CODE_FIELD_NUMBER: _ClassVar[int]
    CURRENCY_NAME_FIELD_NUMBER: _ClassVar[int]
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    RATE_FIELD_NUMBER: _ClassVar[int]
    currency_code: str
    currency_name: str
    symbol: str
    rate: float
    def __init__(self, currency_code: _Optional[str] = ..., currency_name: _Optional[str] = ..., symbol: _Optional[str] = ..., rate: _Optional[float] = ...) -> None: ...

class AllRatesResponse(_message.Message):
    __slots__ = ("rates", "success", "error_message")
    RATES_FIELD_NUMBER: _ClassVar[int]
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    ERROR_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    rates: _containers.RepeatedCompositeFieldContainer[RateItem]
    success: bool
    error_message: str
    def __init__(self, rates: _Optional[_Iterable[_Union[RateItem, _Mapping]]] = ..., success: _Optional[bool] = ..., error_message: _Optional[str] = ...) -> None: ...

class ConvertAmountResponse(_message.Message):
    __slots__ = ("original_amount", "converted_amount", "currency_code", "symbol", "rate", "success", "error_message")
    ORIGINAL_AMOUNT_FIELD_NUMBER: _ClassVar[int]
    CONVERTED_AMOUNT_FIELD_NUMBER: _ClassVar[int]
    CURRENCY_CODE_FIELD_NUMBER: _ClassVar[int]
    SYMBOL_FIELD_NUMBER: _ClassVar[int]
    RATE_FIELD_NUMBER: _ClassVar[int]
    SUCCESS_FIELD_NUMBER: _ClassVar[int]
    ERROR_MESSAGE_FIELD_NUMBER: _ClassVar[int]
    original_amount: float
    converted_amount: float
    currency_code: str
    symbol: str
    rate: float
    success: bool
    error_message: str
    def __init__(self, original_amount: _Optional[float] = ..., converted_amount: _Optional[float] = ..., currency_code: _Optional[str] = ..., symbol: _Optional[str] = ..., rate: _Optional[float] = ..., success: _Optional[bool] = ..., error_message: _Optional[str] = ...) -> None: ...
