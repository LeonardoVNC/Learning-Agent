import {
  Modal,
  Form,
  Select,
  Space,
  Button,
  DatePicker,
  message,
  ConfigProvider,
  Tooltip,
} from "antd";
import esES from "antd/locale/es_ES";
import { useFormik } from "formik";
import * as yup from "yup";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/es";

import type { Course } from "../interfaces/courseInterface";
import type { Clase, CreateClassDTO } from "../interfaces/claseInterface";

dayjs.locale("es");
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

const { Option } = Select;
const MIN_BUSINESS_DAYS = 25;

const periodValidationSchema = yup.object({
  semester: yup
    .string()
    .required("El semestre es obligatorio")
    .matches(/^(PRIMERO|SEGUNDO|INVIERNO|VERANO) \d{4}$/, "Semestre inválido"),
  dateBegin: yup.string().required("La fecha de inicio es obligatoria"),
  dateEnd: yup.string().required("La fecha de fin es obligatoria"),
});

interface PeriodFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (periodData: Clase | CreateClassDTO) => void;
  course: Course;
  period?: Clase;
  loading?: boolean;
}

function PeriodForm({
  open,
  onClose,
  onSubmit,
  course,
  period,
  loading = false,
}: PeriodFormProps) {
  const countBusinessDays = (start: Dayjs, end: Dayjs) => {
    let days = 0;
    let current = start.clone();
    while (current.isBefore(end, "day")) {
      const day = current.day();
      if (day !== 0 && day !== 6) days++;
      current = current.add(1, "day");
    }
    return days;
  };

  const formik = useFormik({
    enableReinitialize: true,
    validateOnBlur: false,
    validateOnChange: false,
    initialValues: {
      semester: period?.semester || "",
      dateBegin: period?.dateBegin || "",
      dateEnd: period?.dateEnd || "",
    },
    validationSchema: periodValidationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const start = dayjs(values.dateBegin);
        const end = dayjs(values.dateEnd);

        // Validar mínimo de días hábiles
        const isSpecial =
          values.semester.startsWith("VERANO") ||
          values.semester.startsWith("INVIERNO");

        const minDays = isSpecial ? MIN_BUSINESS_DAYS - 5 : MIN_BUSINESS_DAYS;

        let businessDays = countBusinessDays(start, end);

        if (businessDays < minDays) {
          message.error(`El período debe tener mínimo ${minDays} días hábiles`);
          return;
        }

        if (period) {
          const periodData: Clase = {
            ...period,
            semester: values.semester,
            teacherId: course.teacherId,
            courseId: course.id,
            dateBegin: values.dateBegin,
            dateEnd: values.dateEnd,
          };
          await onSubmit(periodData);
        } else {
          const newPeriod: CreateClassDTO = {
            teacherId: course.teacherId,
            courseId: course.id,
            semester: values.semester,
            dateBegin: values.dateBegin,
            dateEnd: values.dateEnd,
          };
          await onSubmit(newPeriod);
        }

        resetForm();
        onClose();
      } catch (error) {
        console.error(error);
      }
    },
  });

  const handleCancel = () => {
    onClose();
    formik.resetForm();
  };

  const today = dayjs();
  const currentYear = today.year();

  const allPeriods: {
    name: string;
    start: string;
    end: string;
    type: "NORMAL" | "SPECIAL";
  }[] = [];

  for (let year = currentYear - 5; year <= currentYear + 1; year++) {
    allPeriods.push(
      {
        name: `PRIMERO ${year}`,
        start: `${year}-01-01`,
        end: `${year}-06-30`,
        type: "NORMAL",
      },
      {
        name: `INVIERNO ${year}`,
        start: `${year}-06-01`,
        end: `${year}-07-31`,
        type: "SPECIAL",
      },
      {
        name: `SEGUNDO ${year}`,
        start: `${year}-07-01`,
        end: `${year}-12-31`,
        type: "NORMAL",
      },
      {
        name: `VERANO ${year}`,
        start: `${year - 1}-12-01`,
        end: `${year}-01-31`,
        type: "SPECIAL",
      }
    );
  }

  let availableSemesters = allPeriods.sort((a, b) =>
    dayjs(b.start).diff(dayjs(a.start))
  );

  const ranges = availableSemesters.reduce((acc, sem) => {
    acc[sem.name] = {
      start: dayjs(sem.start),
      end: dayjs(sem.end),
      type: sem.type,
    };
    return acc;
  }, {} as Record<string, { start: Dayjs; end: Dayjs; type: string }>);

  const disabledDateBegin = (current: Dayjs) => {
    const { semester } = formik.values;
    if (!semester || !ranges[semester]) return true;

    const { start, end } = ranges[semester];
    return (
      current.isBefore(start, "day") ||
      current.isAfter(end, "day") ||
      current.day() === 0 ||
      current.day() === 6
    );
  };

  const disabledDateEnd = (current: Dayjs) => {
    const { semester } = formik.values;
    if (!semester || !ranges[semester]) return true;

    const { start, end } = ranges[semester];
    return (
      current.isBefore(start, "day") ||
      current.isAfter(end, "day") ||
      current.day() === 0 ||
      current.day() === 6
    );
  };

  const handleDateChange = (
    field: "dateBegin" | "dateEnd",
    value: Dayjs | null
  ) => {
    const { semester } = formik.values;
    if (!semester || !ranges[semester]) return;

    const { end, type } = ranges[semester];

    if (value) {
      const isoDate = value.format("YYYY-MM-DD");
      formik.setFieldValue(field, isoDate);

      if (field === "dateBegin") {
        const minDays =
          type === "SPECIAL" ? MIN_BUSINESS_DAYS - 5 : MIN_BUSINESS_DAYS;

        let temp = value.clone();
        let days = 0;
        while (days < minDays && temp.isBefore(end)) {
          temp = temp.add(1, "day");
          if (temp.day() !== 0 && temp.day() !== 6) days++;
        }
        if (temp.isAfter(end)) temp = end;
        formik.setFieldValue("dateEnd", temp.format("YYYY-MM-DD"));
      }
    } else {
      formik.setFieldValue(field, "");
      if (field === "dateBegin") formik.setFieldValue("dateEnd", "");
    }
  };

  return (
    <ConfigProvider locale={esES}>
      <Modal
        title={`${period ? "Editar" : "Crear"} Período`}
        open={open}
        onCancel={handleCancel}
        footer={null}
        centered
        width={500}
      >
        <Form
          layout="vertical"
          onFinish={formik.handleSubmit}
          style={{ marginTop: "20px" }}
        >
          {/* Select semestre */}
          <Form.Item
            label="Semestre"
            validateStatus={formik.errors.semester ? "error" : ""}
            help={formik.errors.semester || null}
          >
            <Select
              placeholder="Selecciona un semestre"
              value={formik.values.semester || undefined}
              onChange={(value) => {
                formik.setFieldValue("semester", value);
                formik.setFieldTouched("semester", true);
                formik.setFieldValue("dateBegin", "");
                formik.setFieldValue("dateEnd", "");
              }}
              disabled={!!period}
            >
              {availableSemesters.map((sem) => (
                <Option key={sem.name} value={sem.name}>
                  {sem.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Fecha de inicio */}
          <Form.Item
            label="Fecha de inicio"
            validateStatus={formik.errors.dateBegin ? "error" : ""}
            help={formik.errors.dateBegin || null}
          >
            <Tooltip
              title={
                !formik.values.semester
                  ? "Selecciona un semestre para habilitar"
                  : ""
              }
            >
              <DatePicker
                style={{ width: "100%" }}
                format="DD-MM-YYYY"
                disabledDate={disabledDateBegin}
                value={
                  formik.values.dateBegin
                    ? dayjs(formik.values.dateBegin)
                    : null
                }
                defaultPickerValue={
                  formik.values.semester
                    ? ranges[formik.values.semester].start
                    : undefined
                }
                onChange={(date) => {
                  handleDateChange("dateBegin", date);
                  formik.setFieldTouched("dateBegin", true);
                }}
                disabled={!formik.values.semester}
              />
            </Tooltip>
          </Form.Item>

          {/* Fecha de fin */}
          <Form.Item
            label="Fecha de fin"
            validateStatus={formik.errors.dateEnd ? "error" : ""}
            help={formik.errors.dateEnd || null}
          >
            <Tooltip
              title={
                !formik.values.semester
                  ? "Selecciona un semestre para habilitar"
                  : !formik.values.dateBegin
                  ? "Selecciona la fecha de inicio para habilitar"
                  : ""
              }
            >
              <DatePicker
                style={{ width: "100%" }}
                format="DD-MM-YYYY"
                disabledDate={disabledDateEnd}
                value={
                  formik.values.dateEnd ? dayjs(formik.values.dateEnd) : null
                }
                defaultPickerValue={
                  formik.values.semester
                    ? ranges[formik.values.semester].start
                    : undefined
                }
                onChange={(date) => {
                  handleDateChange("dateEnd", date);
                  formik.setFieldTouched("dateEnd", true);
                }}
                disabled={!formik.values.dateBegin}
              />
            </Tooltip>
          </Form.Item>

          {/* Botones */}
          <Form.Item style={{ marginTop: "24px", marginBottom: 0 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={handleCancel}
                danger
                type="primary"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading || formik.isSubmitting}
              >
                {period ? "Actualizar Período" : "Crear Período"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
}

export default PeriodForm;
